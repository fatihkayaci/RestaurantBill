using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Delivery;

// Paket servisin ortak kuralları: şube seçimi, sipariş saatleri, müşteriye görünen durum adları, maskeleme, eşleme.
public static class DeliveryScope
{
    public const string NotFoundMessage = "Böyle bir online sipariş bulunamadı.";
    public const string TrackingNotFoundMessage = "Sipariş bulunamadı. Bağlantıyı kontrol edin.";
    public const string RestaurantNotFoundMessage = "Restoran bulunamadı.";
    public const string DisabledMessage = "Bu restoran şu an online sipariş almıyor.";
    public const string PausedMessage = "Restoran şu an online sipariş almıyor. Lütfen biraz sonra tekrar deneyin ya da restoranı arayın.";
    public const string PriceChangedMessage = "Fiyatlar güncellendi";
    public const string WaiterDeniedMessage = "Paket siparişler garson ekranından yönetilemez.";
    /// <summary>Aynı IP'den restoranın henüz yanıtlamadığı en fazla sipariş sayısı.</summary>
    public const int MaxPendingPerIp = 3;

    public static readonly DeliveryOrderStatus[] OpenStatuses =
    [
        DeliveryOrderStatus.Received, DeliveryOrderStatus.Accepted, DeliveryOrderStatus.Preparing,
        DeliveryOrderStatus.Ready, DeliveryOrderStatus.OnTheWay
    ];

    // Kuryenin üzerindeki (yola çıkmadan önce ya da yolda) siparişler.
    public static readonly DeliveryOrderStatus[] CourierActiveStatuses =
    [
        DeliveryOrderStatus.Accepted, DeliveryOrderStatus.Preparing, DeliveryOrderStatus.Ready, DeliveryOrderStatus.OnTheWay
    ];

    // ── Şube ────────────────────────────────────────────────────────────────────────────────────────

    /// <summary>Şirketin şubeleri; branchId verilmezse online siparişi açık en eski şube, o da yoksa en eski şube.</summary>
    public static async Task<(Branch? Branch, List<Branch> EnabledBranches)> ResolveBranchAsync(
        IAppDbContext db, Guid companyId, Guid? branchId, CancellationToken cancellationToken)
    {
        List<Branch> branches = await db.Branches.AsNoTracking()
            .Where(b => b.CompanyId == companyId && !b.IsDeleted)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        List<Branch> enabled = branches.Where(b => b.GetOnlineOrderSettings().Enabled).ToList();

        Branch? branch = branchId is Guid id && id != Guid.Empty
            ? branches.FirstOrDefault(b => b.Id == id)
            : enabled.FirstOrDefault() ?? branches.FirstOrDefault();
        return (branch, enabled);
    }

    // ── Sipariş saatleri ────────────────────────────────────────────────────────────────────────────

    public sealed record Availability(string State, bool IsOpen, string Message, DateTime? NextOpensAt, DateTime? LastOrderAt);

    /// <summary>Şubenin şu an sipariş alıp almadığı: ayarda kapalı, kasada durdurulmuş, saat dışı ya da açık.</summary>
    public static Availability AvailabilityOf(Branch branch, DateTime utcNow)
    {
        OnlineOrderSettings settings = branch.GetOnlineOrderSettings();
        if (!settings.Enabled)
            return new Availability(OnlineOrderingState.Disabled, false, DisabledMessage, null, null);

        TimeZoneInfo zone = CustomerSiteScope.ZoneOf(branch.TimeZoneId);
        Hours hours = EvaluateHours(settings, zone, utcNow);

        if (branch.OnlineOrdersPaused)
            return new Availability(OnlineOrderingState.Paused, false, PausedMessage, null, hours.LastOrderAt);

        if (hours.AcceptingNow)
            return new Availability(OnlineOrderingState.Open, true, string.Empty, null, hours.LastOrderAt);

        return new Availability(OnlineOrderingState.Closed, false, ClosedMessage(hours.NextOpensAt, zone, utcNow), hours.NextOpensAt, null);
    }

    public sealed record Hours(bool AcceptingNow, DateTime? LastOrderAt, DateTime? NextOpensAt);

    /// <summary>
    /// Şubenin yerel saatine göre şu an sipariş alınabilir mi. Kapanış açılıştan küçük ya da eşitse aralık gece yarısını
    /// aşar (dünün 18:00–02:00 aralığı bu sabah 01:00'i kapsar). Kapanıştan LastOrderMinutesBeforeClose dakika önce
    /// sipariş alma biter. "24 saat" gün (00:00–23:59) ertesi gece yarısına kadar sürer ve son sipariş kesintisi yoktur.
    /// Birbirine değen ya da örtüşen aralıklar tek aralık sayılır: art arda 24 saat günlerde son sipariş, zincirin
    /// bittiği yerdir; zincir bakılan bir haftanın sonuna kadar sürüyorsa son sipariş saati yoktur (her zaman açık).
    /// Sonraki açılış en fazla bir hafta ileriye bakılarak bulunur.
    /// </summary>
    public static Hours EvaluateHours(OnlineOrderSettings settings, TimeZoneInfo zone, DateTime utcNow)
    {
        DateTime local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), zone);
        const int lastOffset = 7;

        // Dünden itibaren sekiz günün sipariş aralıkları: [başlangıç, son sipariş).
        List<(DateTime Start, DateTime LastOrder, int Offset)> windows = [];
        for (int offset = -1; offset <= lastOffset; offset++)
        {
            DateTime date = local.Date.AddDays(offset);
            OnlineOrderDayHours day = settings.For(date.DayOfWeek);
            if (!day.IsOpen)
                continue;

            DateTime start = date.Add(day.Opens.ToTimeSpan());
            DateTime lastOrder;
            if (day.IsAllDay)
                lastOrder = date.AddDays(1);
            else
            {
                DateTime end = date.Add(day.Closes.ToTimeSpan());
                if (day.Closes <= day.Opens)
                    end = end.AddDays(1);
                lastOrder = end.AddMinutes(-settings.LastOrderMinutesBeforeClose);
            }
            if (lastOrder > start)
                windows.Add((start, lastOrder, offset));
        }

        var current = windows.Where(w => local >= w.Start && local < w.LastOrder).OrderByDescending(w => w.LastOrder).FirstOrDefault();
        if (current == default)
        {
            DateTime? next = windows.Where(w => w.Start > local).Select(w => (DateTime?)w.Start).Min();
            return new Hours(false, null, next is DateTime n ? ToUtc(n, zone) : null);
        }

        // Kesintisiz zinciri sona kadar izle: bitiş anında başlamış (ve o an hâlâ açık) bir aralık zinciri uzatır.
        var reach = current;
        while (true)
        {
            var longer = windows.Where(w => w.Start <= reach.LastOrder && w.LastOrder > reach.LastOrder)
                .OrderByDescending(w => w.LastOrder).FirstOrDefault();
            if (longer == default)
                break;
            reach = longer;
        }

        DateTime? lastOrderAt = reach.Offset == lastOffset ? null : ToUtc(reach.LastOrder, zone);
        return new Hours(true, lastOrderAt, null);
    }

    private static string ClosedMessage(DateTime? nextOpensAt, TimeZoneInfo zone, DateTime utcNow)
    {
        if (nextOpensAt is not DateTime next)
            return "Online sipariş şu an kapalı.";

        DateTime local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(next, DateTimeKind.Utc), zone);
        DateTime today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), zone).Date;
        string day = (local.Date - today).Days switch
        {
            0 => "Bugün",
            1 => "Yarın",
            _ => ReservationSettings.DayName(local.DayOfWeek)
        };
        return $"Online sipariş şu an kapalı. {day} {local.ToString("HH:mm", CultureInfo.InvariantCulture)} itibarıyla sipariş verebilirsiniz.";
    }

    // Yaz saati geçişinde var olmayan yerel saat bir saat ileri alınır.
    private static DateTime ToUtc(DateTime local, TimeZoneInfo zone)
    {
        DateTime unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        try
        {
            return TimeZoneInfo.ConvertTimeToUtc(unspecified, zone);
        }
        catch (ArgumentException)
        {
            return TimeZoneInfo.ConvertTimeToUtc(unspecified.AddHours(1), zone);
        }
    }

    public static List<PaymentMethod> PaymentMethodsOf(OnlineOrderSettings settings)
    {
        List<PaymentMethod> methods = [];
        if (settings.AcceptCash) methods.Add(PaymentMethod.Nakit);
        if (settings.AcceptCard) methods.Add(PaymentMethod.Kart);
        return methods;
    }

    // ── Durum adları ────────────────────────────────────────────────────────────────────────────────

    /// <summary>Müşterinin takip sayfasındaki kısa durum adı.</summary>
    public static string CustomerLabel(DeliveryOrderStatus status) => status switch
    {
        DeliveryOrderStatus.Received => "Onay bekliyor",
        DeliveryOrderStatus.Accepted => "Onaylandı",
        DeliveryOrderStatus.Preparing => "Hazırlanıyor",
        DeliveryOrderStatus.Ready => "Hazır, yola çıkmak üzere",
        DeliveryOrderStatus.OnTheWay => "Yolda",
        DeliveryOrderStatus.Delivered => "Teslim edildi",
        DeliveryOrderStatus.Rejected => "Sipariş alınamadı",
        DeliveryOrderStatus.Cancelled => "İptal edildi",
        _ => string.Empty
    };

    /// <summary>Takip sayfasında durum adının altındaki açıklama.</summary>
    public static string CustomerDescription(DeliveryOrder order) => order.Status switch
    {
        DeliveryOrderStatus.Received => "Siparişiniz restorana ulaştı. Restoran onayladığında burada göreceksiniz.",
        DeliveryOrderStatus.Accepted => "Restoran siparişinizi onayladı, birazdan hazırlanmaya başlayacak.",
        DeliveryOrderStatus.Preparing => "Siparişiniz mutfakta hazırlanıyor.",
        DeliveryOrderStatus.Ready => "Siparişiniz hazır, kurye birazdan yola çıkacak.",
        DeliveryOrderStatus.OnTheWay => "Kurye yolda, siparişiniz geliyor.",
        DeliveryOrderStatus.Delivered => "Afiyet olsun!",
        DeliveryOrderStatus.Rejected => order.RejectReason,
        DeliveryOrderStatus.Cancelled => order.CancelledByUserId is null
            ? "Siparişinizi iptal ettiniz."
            : string.IsNullOrEmpty(order.CancelReason) ? "Restoran siparişi iptal etti." : $"Restoran siparişi iptal etti: {order.CancelReason}",
        _ => string.Empty
    };

    /// <summary>Personel ekranındaki durum adı.</summary>
    public static string StaffLabel(DeliveryOrderStatus status) => status switch
    {
        DeliveryOrderStatus.Received => "Yeni",
        DeliveryOrderStatus.Accepted => "Kabul edildi",
        DeliveryOrderStatus.Preparing => "Hazırlanıyor",
        DeliveryOrderStatus.Ready => "Hazır",
        DeliveryOrderStatus.OnTheWay => "Yolda",
        DeliveryOrderStatus.Delivered => "Teslim edildi",
        DeliveryOrderStatus.Rejected => "Reddedildi",
        DeliveryOrderStatus.Cancelled => "İptal",
        _ => string.Empty
    };

    // ── Maskeleme ───────────────────────────────────────────────────────────────────────────────────

    /// <summary>"Ahmet Yılmaz" → "Ahmet Y."; tek kelimede yalnızca ad.</summary>
    public static string MaskName(string fullName)
    {
        string[] parts = (fullName ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0) return string.Empty;
        if (parts.Length == 1) return parts[0];
        return $"{parts[0]} {char.ToUpper(parts[^1][0], new CultureInfo("tr-TR"))}.";
    }

    /// <summary>"+905321234567" → "0532 *** ** 67".</summary>
    public static string MaskPhone(string normalizedPhone)
    {
        if (normalizedPhone is not { Length: Domain.Shared.TurkishPhone.NormalizedLength })
            return string.Empty;
        string digits = normalizedPhone[3..];
        return $"0{digits[..3]} *** ** {digits[^2..]}";
    }

    // ── Mutfak bileti ───────────────────────────────────────────────────────────────────────────────

    /// <summary>Mutfak ve kasa ekranında masa adı yerine: "PAKET #123 · Moda".</summary>
    public static string TicketName(int number, string? zoneName)
        => string.IsNullOrWhiteSpace(zoneName) ? $"PAKET #{number}" : $"PAKET #{number} · {zoneName}";

    public sealed record DeliveryLabel(int Number, string ZoneName);

    /// <summary>Paket siparişlerin (OrderId → numara, bölge) etiketleri; masa siparişleri sözlükte yer almaz.</summary>
    public static async Task<Dictionary<Guid, DeliveryLabel>> LoadDeliveryLabelsAsync(
        this IAppDbContext db, IEnumerable<Order> orders, CancellationToken cancellationToken)
    {
        List<Guid> ids = orders.Where(o => o.OrderType == OrderType.Delivery).Select(o => o.Id).Distinct().ToList();
        if (ids.Count == 0)
            return [];

        var rows = await db.DeliveryOrders.AsNoTracking()
            .Where(d => d.OrderId != null && ids.Contains(d.OrderId.Value))
            .Select(d => new { OrderId = d.OrderId!.Value, d.Number, d.ZoneName })
            .ToListAsync(cancellationToken);

        return rows.GroupBy(r => r.OrderId).ToDictionary(g => g.Key, g => new DeliveryLabel(g.First().Number, g.First().ZoneName));
    }

    /// <summary>Paket siparişin DTO'sunu "PAKET #123 · Moda" etiketiyle doldurur.</summary>
    public static void ApplyDeliveryLabel(this DTOs.OrderDto dto, IReadOnlyDictionary<Guid, DeliveryLabel> labels)
    {
        if (!labels.TryGetValue(dto.Id, out DeliveryLabel? label))
            return;
        dto.DeliveryNumber = label.Number;
        dto.ZoneName = label.ZoneName;
        dto.TableName = TicketName(label.Number, label.ZoneName);
    }

    // ── Eşleme ──────────────────────────────────────────────────────────────────────────────────────

    /// <summary>Menü satırının saklanan seçimleri (bölüm Id → ürün Id); bozuk/boş JSON boş sözlük.</summary>
    public static Dictionary<Guid, Guid> ParseSelections(string? selectionsJson)
    {
        if (string.IsNullOrWhiteSpace(selectionsJson))
            return [];
        try
        {
            return JsonSerializer.Deserialize<Dictionary<Guid, Guid>>(selectionsJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string SerializeSelections(IReadOnlyDictionary<Guid, Guid> selections)
        => JsonSerializer.Serialize(selections);

    /// <summary>Satırlar; menü seçimlerinin adları için seçilen ürünlerin adları verilir (Id → ad).</summary>
    public static List<DeliveryLineDto> ToLineDtos(DeliveryOrder order, IReadOnlyDictionary<Guid, string> productNames)
        => order.Lines
            .OrderBy(l => l.CreatedAt)
            .Select(l => new DeliveryLineDto
            {
                Kind = l.Kind,
                ProductId = l.ProductId,
                SetMenuId = l.SetMenuId,
                Name = l.NameSnapshot,
                UnitPrice = l.UnitPrice,
                Quantity = l.Quantity,
                LineTotal = l.UnitPrice * l.Quantity,
                Note = l.Note,
                Selections = l.Kind == DeliveryOrderLineKind.SetMenu
                    ? ParseSelections(l.SelectionsJson).Values.Select(id => productNames.GetValueOrDefault(id, string.Empty)).Where(n => n.Length > 0).ToList()
                    : []
            })
            .ToList();

    /// <summary>Menü satırlarında seçilen ürünlerin adları.</summary>
    public static async Task<Dictionary<Guid, string>> LoadSelectionNamesAsync(
        this IAppDbContext db, IEnumerable<DeliveryOrder> orders, CancellationToken cancellationToken)
    {
        List<Guid> ids = orders.SelectMany(o => o.Lines)
            .Where(l => l.Kind == DeliveryOrderLineKind.SetMenu)
            .SelectMany(l => ParseSelections(l.SelectionsJson).Values)
            .Distinct()
            .ToList();
        if (ids.Count == 0)
            return [];

        return await db.Products.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Name, cancellationToken);
    }

    public static DeliveryOrderDto ToStaffDto(DeliveryOrder order, OnlineOrderSettings settings, int? zoneEstimatedMinutes,
        IReadOnlyDictionary<Guid, string> productNames, string? courierName, bool isPhoneBlocked) => new()
    {
        Id = order.Id,
        BranchId = order.BranchId,
        Number = order.Number,
        Status = order.Status,
        StatusLabel = StaffLabel(order.Status),
        CustomerName = order.CustomerName,
        CustomerPhone = order.CustomerPhone,
        Address = order.Address,
        AddressDirections = order.AddressDirections,
        Note = order.Note,
        DeliveryZoneId = order.DeliveryZoneId,
        ZoneName = order.ZoneName,
        PaymentPreference = order.PaymentPreference,
        Lines = ToLineDtos(order, productNames),
        Subtotal = order.Subtotal,
        DeliveryFee = order.DeliveryFee,
        Total = order.Total,
        OrderId = order.OrderId,
        EstimatedMinutes = order.EstimatedMinutes,
        SuggestedEtaMinutes = zoneEstimatedMinutes ?? settings.DefaultEtaMinutes,
        CreatedAt = order.CreatedAt,
        AutoRejectAt = order.Status == DeliveryOrderStatus.Received ? order.CreatedAt.AddMinutes(settings.AutoRejectAfterMinutes) : null,
        AcceptedAt = order.AcceptedAt,
        RejectedAt = order.RejectedAt,
        RejectReason = order.RejectReason,
        IsAutoRejected = order.Status == DeliveryOrderStatus.Rejected && order.RejectedByUserId is null,
        CancelledAt = order.CancelledAt,
        CancelReason = order.CancelReason,
        CancelledByCustomer = order.Status == DeliveryOrderStatus.Cancelled && order.CancelledByUserId is null,
        CourierUserId = order.CourierUserId,
        CourierName = courierName,
        DispatchedAt = order.DispatchedAt,
        DeliveredAt = order.DeliveredAt,
        CollectedMethod = order.CollectedMethod,
        CollectedAmount = order.CollectedAmount,
        SettledAt = order.SettledAt,
        IsPhoneBlocked = isPhoneBlocked
    };

    // ── Denetim kaydı ───────────────────────────────────────────────────────────────────────────────

    public static void AddAudit(this IAppDbContext db, DeliveryOrder order, string actorName, string action, string message,
        AuditLogSeverity severity = AuditLogSeverity.Info)
        => db.AuditLogs.Add(AuditLog.Create(order.BranchId, actorName, AuditLogCategory.Order, severity, action, message, nameof(DeliveryOrder), order.Id));

    public static async Task<string> ActorNameAsync(this IAppDbContext db, ICurrentUserService currentUser, CancellationToken cancellationToken)
        => await db.Users.AsNoTracking().Where(u => u.Id == currentUser.UserId).Select(u => u.FullName).FirstOrDefaultAsync(cancellationToken)
            ?? string.Empty;
}
