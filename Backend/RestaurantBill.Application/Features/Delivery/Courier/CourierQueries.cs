using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Courier;

// Kurye ekranı (api/courier). StaffAccess kuryeyi kısıtsız sayar; bu yüzden her sorgu kendisi CourierUserId == ben ve
// kuryenin şubesiyle süzer. Kurye başka kuryenin siparişini hiçbir uçtan göremez.
internal static class CourierScope
{
    public static IQueryable<DeliveryOrder> Mine(this IQueryable<DeliveryOrder> query, ICurrentUserService currentUser)
        => query.Where(d => d.BranchId == currentUser.BranchId && d.CourierUserId == currentUser.UserId && !d.IsDeleted);

    /// <summary>Şubenin bugünkü iş gününün başlangıcı (gün sonu saatine göre).</summary>
    public static async Task<DateTime?> BusinessDayStartAsync(
        IAppDbContext db, ICurrentUserService currentUser, IBusinessDayResolver businessDay, TimeProvider clock, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.Id == currentUser.BranchId, cancellationToken);
        if (branch is null)
            return null;

        DateOnly today = businessDay.ResolveBusinessDay(branch, clock.GetUtcNow().UtcDateTime);
        return businessDay.ToUtcRange(branch, today, today).FromUtc;
    }

    /// <summary>
    /// Yol tarifi araması: adres (daire/kat parçaları çıkarılmış), bölge (mahalle), şubenin ilçesi ve şehri
    /// ("Moda Cad. No:1, Moda, Kadıköy, İstanbul"). Daire/kat haritada aranamaz, bulmayı bozar; kurye ekranında adres tam kalır.
    /// </summary>
    public static string MapsQuery(DeliveryOrder order, string city, string district = "")
        => string.Join(", ", new[] { StripUnitParts(order.Address), order.ZoneName, district, city }
            .Where(part => !string.IsNullOrWhiteSpace(part)).Select(part => part.Trim())
            .Distinct(StringComparer.CurrentCultureIgnoreCase));

    // "D:3", "D.3", "Daire 5", "Kat:2", "K.2" gibi haritada karşılığı olmayan parçalar.
    private static readonly System.Text.RegularExpressions.Regex UnitParts = new(
        @"\b(?:d(?:aire)?|kat|k)\s*[:.]?\s*\d+\b|\b(?:daire|kat)\b",
        System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.CultureInvariant);

    internal static string StripUnitParts(string? address)
    {
        if (string.IsNullOrWhiteSpace(address))
            return string.Empty;
        string cleaned = UnitParts.Replace(address, " ");
        cleaned = System.Text.RegularExpressions.Regex.Replace(cleaned, @"\s*,\s*(,\s*)+", ", ");
        cleaned = System.Text.RegularExpressions.Regex.Replace(cleaned, @"\s{2,}", " ");
        return cleaned.Trim(' ', ',', '/', '-');
    }
}

// ── Kuryenin siparişleri: üzerindeki açık siparişler (kabulden yola kadar) + bugün teslim ettikleri ─────────
public class GetCourierOrdersQuery : IRequest<Result<List<CourierOrderDto>>>;

public class GetCourierOrdersQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IBusinessDayResolver businessDay, TimeProvider clock)
    : IRequestHandler<GetCourierOrdersQuery, Result<List<CourierOrderDto>>>
{
    public async Task<Result<List<CourierOrderDto>>> Handle(GetCourierOrdersQuery request, CancellationToken cancellationToken)
    {
        DateTime? dayStart = await CourierScope.BusinessDayStartAsync(db, currentUser, businessDay, clock, cancellationToken);
        if (dayStart is null)
            return Result<List<CourierOrderDto>>.Success([]);

        DateTime start = dayStart.Value;
        List<DeliveryOrder> orders = await db.DeliveryOrders.AsNoTracking()
            .Include(d => d.Lines)
            .Mine(currentUser)
            .Where(d => DeliveryScope.CourierActiveStatuses.Contains(d.Status)
                || (d.Status == DeliveryOrderStatus.Delivered && d.DeliveredAt >= start))
            .ToListAsync(cancellationToken);

        var place = await db.Branches.AsNoTracking()
            .Where(b => b.Id == currentUser.BranchId)
            .Select(b => new { b.City, b.District })
            .FirstOrDefaultAsync(cancellationToken);
        string city = place?.City ?? string.Empty;
        string district = place?.District ?? string.Empty;
        Dictionary<Guid, string> productNames = await db.LoadSelectionNamesAsync(orders, cancellationToken);
        DateTime now = clock.GetUtcNow().UtcDateTime;

        // Önce üzerindeki siparişler (yoldakiler en üstte, sonra kabul sırası), altta bugün teslim edilenler (en yeni üstte).
        List<CourierOrderDto> result = orders
            .OrderBy(d => d.Status == DeliveryOrderStatus.Delivered ? 2 : d.Status == DeliveryOrderStatus.OnTheWay ? 0 : 1)
            .ThenByDescending(d => d.Status == DeliveryOrderStatus.Delivered ? d.DeliveredAt : null)
            .ThenBy(d => d.AcceptedAt ?? d.CreatedAt)
            .Select(d => new CourierOrderDto
            {
                Id = d.Id,
                Number = d.Number,
                Status = d.Status,
                StatusLabel = DeliveryScope.StaffLabel(d.Status, d.IsPickup),
                CustomerName = d.CustomerName,
                CustomerPhone = d.CustomerPhone,
                Address = d.Address,
                AddressDirections = d.AddressDirections,
                ZoneName = d.ZoneName,
                Note = d.Note,
                MapsQuery = CourierScope.MapsQuery(d, city, district),
                Lines = DeliveryScope.ToLineDtos(d, productNames),
                Subtotal = d.Subtotal,
                DeliveryFee = d.DeliveryFee,
                Total = d.Total,
                // Kuryeye yalnızca adrese teslim siparişi düşer; orada tercih her zaman doludur.
                PaymentPreference = d.PaymentPreference ?? PaymentMethod.Nakit,
                AcceptedAt = d.AcceptedAt,
                EstimatedDeliveryAt = d.AcceptedAt is DateTime acceptedAt && d.EstimatedMinutes is int eta ? acceptedAt.AddMinutes(eta) : null,
                DispatchedAt = d.DispatchedAt,
                DeliveredAt = d.DeliveredAt,
                CollectedMethod = d.CollectedMethod,
                CollectedAmount = d.CollectedAmount,
                SettledAt = d.SettledAt,
                CanDispatch = d.Status == DeliveryOrderStatus.Ready,
                CanDeliver = d.Status == DeliveryOrderStatus.OnTheWay,
                UndoDeliverUntil = d.UndoDeliverDeadline() is DateTime until && until > now ? until : null
            })
            .ToList();

        return Result<List<CourierOrderDto>>.Success(result);
    }
}

// ── "Bugün": teslim edilen sipariş sayısı ve üzerindeki, kasaya teslim edilmemiş tahsilat ──────────────────
public class GetCourierSummaryQuery : IRequest<Result<CourierDaySummaryDto>>;

public class GetCourierSummaryQueryHandler(IAppDbContext db, ICurrentUserService currentUser, IBusinessDayResolver businessDay, TimeProvider clock)
    : IRequestHandler<GetCourierSummaryQuery, Result<CourierDaySummaryDto>>
{
    public async Task<Result<CourierDaySummaryDto>> Handle(GetCourierSummaryQuery request, CancellationToken cancellationToken)
    {
        DateTime start = await CourierScope.BusinessDayStartAsync(db, currentUser, businessDay, clock, cancellationToken) ?? DateTime.MaxValue;

        var rows = await db.DeliveryOrders.AsNoTracking()
            .Mine(currentUser)
            .Where(d => DeliveryScope.CourierActiveStatuses.Contains(d.Status)
                || (d.Status == DeliveryOrderStatus.Delivered && (d.SettledAt == null || d.DeliveredAt >= start)))
            .Select(d => new { d.Status, d.DeliveredAt, d.SettledAt, d.CollectedMethod, d.CollectedAmount })
            .ToListAsync(cancellationToken);

        var outstanding = rows.Where(r => r.Status == DeliveryOrderStatus.Delivered && r.SettledAt == null).ToList();
        var cash = outstanding.Where(r => r.CollectedMethod == PaymentMethod.Nakit).ToList();
        // Kart ve IBAN: kuryede para yok, kasiyer yalnızca tahsilatı onaylar.
        var card = outstanding.Where(r => r.CollectedMethod is PaymentMethod.Kart or PaymentMethod.Iban).ToList();

        return Result<CourierDaySummaryDto>.Success(new CourierDaySummaryDto
        {
            DeliveredTodayCount = rows.Count(r => r.Status == DeliveryOrderStatus.Delivered && r.DeliveredAt >= start),
            ActiveOrderCount = rows.Count(r => DeliveryScope.CourierActiveStatuses.Contains(r.Status)),
            OutstandingCash = cash.Sum(r => r.CollectedAmount ?? 0m),
            OutstandingCashOrderCount = cash.Count,
            OutstandingCard = card.Sum(r => r.CollectedAmount ?? 0m),
            OutstandingCardOrderCount = card.Count
        });
    }
}
