using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Payments;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Staff;

// ── "Teslim al": kuryenin kapıda tahsil ettiği siparişler kasiyerin vardiyasına geçer, siparişler kapanır ──────
public class HandoverCourierCashCommand : IRequest<Result<CourierHandoverResultDto>>
{
    public const int MaxOrders = 100;

    public Guid CourierUserId { get; set; }
    public Guid CashRegisterId { get; set; }
    public List<Guid> DeliveryOrderIds { get; set; } = [];
    /// <summary>
    /// Kasiyerin kuryeden aldığı nakdi sayıp yazdığı tutar. Beklenenle farkı (eksik/fazla) teslim kaydına yazılır, teslimi
    /// durdurmaz. null: sayım girilmedi (eski istemci); teslimde nakit yoksa yok sayılır.
    /// </summary>
    public decimal? CountedCash { get; set; }
}

public class HandoverCourierCashCommandValidator : AbstractValidator<HandoverCourierCashCommand>
{
    public HandoverCourierCashCommandValidator()
    {
        RuleFor(x => x.CourierUserId).NotEqual(Guid.Empty).WithMessage("Geçerli bir kurye seçin.");
        RuleFor(x => x.CashRegisterId).NotEqual(Guid.Empty).WithMessage("Geçersiz kasa Id.");
        RuleFor(x => x.DeliveryOrderIds)
            .NotEmpty().WithMessage("Teslim alınacak en az bir sipariş seçin.")
            .Must(ids => ids.Count <= HandoverCourierCashCommand.MaxOrders)
            .WithMessage($"Tek seferde en fazla {HandoverCourierCashCommand.MaxOrders} sipariş teslim alınabilir.")
            .Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Aynı sipariş birden fazla kez gönderilemez.")
            .Must(ids => !ids.Contains(Guid.Empty)).WithMessage("Geçersiz sipariş.");
        RuleFor(x => x.CountedCash)
            .InclusiveBetween(0m, 1_000_000m).When(x => x.CountedCash is not null)
            .WithMessage("Sayılan tutar 0 ile 1.000.000 arasında olmalı.");
    }
}

/// <summary>
/// Sahibin kararı: kurye tahsilatı (nakit ya da kart) kaydeder, sipariş yalnızca kasiyerin "Teslim al"ıyla kapanır.
/// Her sipariş için ürün ödemeleri (KDV oranı başına, satır kalemleriyle) ve teslimat ücretinin ayrı ödemesi (şube KDV
/// oranı) kuryenin tahsil yöntemiyle yazılır; Payment.UserId kuryedir. Nakit, kasiyerin kendi açık vardiyasındaki kasaya
/// giriş hareketi olur (ödeme ekranındaki kasiyer kuralı). Ya hepsi ya hiçbiri: tek SaveChanges.
/// </summary>
public class HandoverCourierCashCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    ICashierNotificationService cashierNotifications,
    ICourierNotificationService courierNotifications,
    TimeProvider clock)
    : IRequestHandler<HandoverCourierCashCommand, Result<CourierHandoverResultDto>>
{
    public const string RegisterNotFoundMessage = "Böyle bir kasa bulunamadı.";
    public const string NoOpenShiftMessage = "Bu kasada açık bir vardiya yok, önce vardiyayı başlatın.";
    public const string NotOwnShiftMessage = "Bu kasa başka birinin gününe atanmış. Kasayı size yöneticiniz atar.";
    public const string CourierNotFoundMessage = "Böyle bir kurye bulunamadı.";
    public const string OrderNotFoundMessage = "Seçilen siparişlerden biri bulunamadı.";

    public async Task<Result<CourierHandoverResultDto>> Handle(HandoverCourierCashCommand request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Failure(denied);

        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);

        CashRegister? register = await db.CashRegisters
            .InBranches(branchIds).FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
        if (register is null)
            return Failure(RegisterNotFoundMessage);

        Shift? shift = await db.Shifts
            .FirstOrDefaultAsync(s => s.CashRegisterId == register.Id && s.Status == ShiftStatus.Open, cancellationToken);
        if (shift is null)
            return Failure(NoOpenShiftMessage);

        // Ödeme ekranıyla aynı kural: kasiyer yalnızca kendi vardiyasındaki kasaya alır ki kasa farkı doğru kişiye yazılsın.
        if (currentUser.Role == "Cashier" && shift.OpenedByUserId != currentUser.UserId)
            return Failure(NotOwnShiftMessage);

        Guid branchId = register.BranchId;

        // Kurye o şubenin kuryesi olmalı. Pasife alınmış kuryenin üzerinde kalan tahsilat da teslim alınabilsin diye
        // aktiflik aranmaz.
        string? courierName = await db.UserBranches.AsNoTracking()
            .Where(ub => ub.UserId == request.CourierUserId && ub.BranchId == branchId && ub.Role == UserRole.Courier && !ub.IsDeleted)
            .Select(ub => ub.User.FullName)
            .FirstOrDefaultAsync(cancellationToken);
        if (courierName is null)
            return Failure(CourierNotFoundMessage);

        // Başka şubenin siparişi "bulunamadı" sayılır.
        List<DeliveryOrder> deliveries = await db.DeliveryOrders
            .Where(d => request.DeliveryOrderIds.Contains(d.Id) && d.BranchId == branchId && !d.IsDeleted)
            .ToListAsync(cancellationToken);
        if (deliveries.Count != request.DeliveryOrderIds.Distinct().Count())
            return Failure(OrderNotFoundMessage);

        // Ya hepsi ya hiçbiri: tek bir uygunsuz sipariş tüm teslimi durdurur.
        foreach (DeliveryOrder delivery in deliveries.OrderBy(d => d.Number))
        {
            string label = DeliveryScope.TicketName(delivery.Number, null);
            if (delivery.CourierUserId != request.CourierUserId)
                return Failure($"{label} bu kuryenin siparişi değil.");
            if (delivery.IsSettled)
                return Failure($"{label} siparişinin tahsilatı zaten teslim alındı.");
            if (delivery.Status != DeliveryOrderStatus.Delivered || delivery.CollectedMethod is null || delivery.OrderId is null)
                return Failure($"{label} henüz teslim edilmedi.");
        }

        List<Guid> orderIds = deliveries.Select(d => d.OrderId!.Value).ToList();
        Dictionary<Guid, Order> orders = await db.Orders
            .Include(o => o.OrderItems).ThenInclude(i => i.Product).ThenInclude(p => p!.Category)
            .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu).ThenInclude(s => s!.Category)
            .Where(o => orderIds.Contains(o.Id))
            .ToDictionaryAsync(o => o.Id, cancellationToken);

        foreach (DeliveryOrder delivery in deliveries)
        {
            string label = DeliveryScope.TicketName(delivery.Number, null);
            if (!orders.TryGetValue(delivery.OrderId!.Value, out Order? order) || order.IsClosed())
                return Failure($"{label} siparişinin hesabı bulunamadı ya da kapanmış.");

            // Kurye müşteriden siparişin onaylanan toplamını alır. Hesap sonradan değiştiyse (ürün eklendi/çıkarıldı) kasaya
            // yanlış tutar geçmesin diye teslim durdurulur.
            if (order.RemainingAmount != (delivery.CollectedAmount ?? 0m))
                return Failure($"{label}: hesap (₺{order.RemainingAmount:0.##}) kuryenin tahsil ettiği tutardan " +
                               $"(₺{delivery.CollectedAmount ?? 0m:0.##}) farklı. Siparişin ürünlerini kontrol edin.");
        }

        decimal feeTaxRate = await db.Branches.AsNoTracking()
            .Where(b => b.Id == branchId)
            .Select(b => b.TaxRate)
            .FirstAsync(cancellationToken);

        var recorder = new PaymentRecorder(db);
        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        DateTime now = clock.GetUtcNow().UtcDateTime;
        var result = new CourierHandoverResultDto { SettledCount = deliveries.Count };

        try
        {
            foreach (DeliveryOrder delivery in deliveries.OrderBy(d => d.Number))
            {
                Order order = orders[delivery.OrderId!.Value];
                PaymentMethod method = delivery.CollectedMethod!.Value;
                var target = new PaymentTarget(register, shift, method, request.CourierUserId);

                List<(OrderItem Item, int Quantity)> lines = PaymentRecorder.BillLines(order).Select(i => (i, i.Quantity)).ToList();
                Dictionary<decimal, decimal> paidOnAccountByRate = await recorder.PaidOnAccountByRateAsync(order, cancellationToken);
                var recorded = recorder.RecordItems(order, lines, target, paidOnAccountByRate, PaymentDiscount.None);
                if (recorded.IsFailure)
                    return Failure(recorded.Error!);

                decimal amount = recorded.Value.NetTotal + recorder.RecordDeliveryFee(order, target, feeTaxRate);

                // Kasaya giren parayı kasiyer sayar: hareket kasiyerin adına, ödeme kuryenin adına yazılır.
                recorder.RecordCashIn(register, method, amount, currentUser.UserId);

                order.Close();
                delivery.Settle(currentUser.UserId, now);

                if (method == PaymentMethod.Nakit)
                    result.CashAmount += amount;
                else
                    result.CardAmount += amount;

                db.AuditLogs.Add(AuditLog.Create(branchId, actor, AuditLogCategory.Payment, AuditLogSeverity.Info,
                    "DeliveryOrderSettled",
                    $"{actor}, {courierName} kuryesinin online paket sipariş #{delivery.Number} tahsilatını teslim aldı " +
                    $"({DeliveryScope.PaymentWord(method)} ₺{amount:0.##}, {register.Name}).",
                    nameof(DeliveryOrder), delivery.Id));
            }
        }
        catch (DomainException ex)
        {
            return Failure(ex.Message);
        }

        // Nakit sayımı: fark teslimdeki her siparişe yazılır (geçmişte teslim olarak gruplanır) ve denetim kaydına geçer.
        result.ExpectedCash = result.CashAmount;
        bool hasCash = deliveries.Any(d => d.CollectedMethod == PaymentMethod.Nakit);
        if (hasCash && request.CountedCash is decimal counted)
        {
            foreach (DeliveryOrder delivery in deliveries)
                delivery.RecordHandoverCashCount(result.CashAmount, counted);

            decimal difference = DeliveryOrder.CashCountDifference(result.CashAmount, counted);
            result.CountedCash = counted;
            result.CashDifference = difference;
            if (difference != 0m)
                db.AuditLogs.Add(AuditLog.Create(branchId, actor, AuditLogCategory.Payment, AuditLogSeverity.Warning,
                    "CourierCashCountDifference",
                    $"{actor}, {courierName} kuryesinden nakit teslim alırken {(difference < 0 ? "eksik" : "fazla")} saydı: " +
                    $"beklenen ₺{result.CashAmount:0.##}, sayılan ₺{counted:0.##}, fark ₺{difference:0.##} ({register.Name}).",
                    nameof(DeliveryOrder), deliveries.OrderBy(d => d.Number).First().Id));
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (DeliveryOrder delivery in deliveries)
            await cashierNotifications.SendDeliveryOrdersChangedAsync(branchId, new DeliveryOrdersChangedDto { Id = delivery.Id, Status = delivery.Status });
        await cashierNotifications.SendOrdersChangedAsync(branchId);
        await courierNotifications.SendCourierOrdersChangedAsync(branchId, request.CourierUserId);

        return Result<CourierHandoverResultDto>.Success(result);
    }

    private static Result<CourierHandoverResultDto> Failure(string message) => Result<CourierHandoverResultDto>.Failure(message);
}

// ── "Teslim geçmişi": kasiyerin son teslim aldıkları, sayım farkıyla ─────────────────────────────────────────────
/// <summary>
/// Son <see cref="Days"/> günde teslim alınan kurye tahsilatları, teslim başına bir satır (en yeni üstte). Bir teslim:
/// aynı kurye, aynı kasiyer, aynı SettledAt (handler hepsini tek anla yazar).
/// </summary>
public class GetCourierHandoversQuery : IRequest<Result<List<CourierHandoverHistoryDto>>>
{
    public const int DefaultDays = 7;
    public const int MaxDays = 31;
    public const int MaxRows = 100;

    public Guid? BranchId { get; set; }
    public int Days { get; set; } = DefaultDays;
}

public class GetCourierHandoversQueryHandler(IAppDbContext db, ICurrentUserService currentUser, TimeProvider clock)
    : IRequestHandler<GetCourierHandoversQuery, Result<List<CourierHandoverHistoryDto>>>
{
    public async Task<Result<List<CourierHandoverHistoryDto>>> Handle(GetCourierHandoversQuery request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Result<List<CourierHandoverHistoryDto>>.Failure(denied);

        var (branchId, error) = await DeliveryStaff.ResolveSingleBranchAsync(db, currentUser, request.BranchId, cancellationToken);
        if (error is not null)
            return Result<List<CourierHandoverHistoryDto>>.Failure(error);

        int days = Math.Clamp(request.Days, 1, GetCourierHandoversQuery.MaxDays);
        DateTime since = clock.GetUtcNow().UtcDateTime.AddDays(-days);

        var rows = await db.DeliveryOrders.AsNoTracking()
            .Where(d => d.BranchId == branchId && !d.IsDeleted && d.SettledAt != null && d.SettledAt >= since && d.CourierUserId != null)
            .Select(d => new
            {
                SettledAt = d.SettledAt!.Value, CourierId = d.CourierUserId!.Value, d.SettledByUserId, d.Number,
                d.CollectedMethod, d.CollectedAmount, d.HandoverCountedCash, d.HandoverCashDifference
            })
            .ToListAsync(cancellationToken);

        var groups = rows
            .GroupBy(r => (r.SettledAt, r.CourierId, r.SettledByUserId))
            .OrderByDescending(g => g.Key.SettledAt)
            .Take(GetCourierHandoversQuery.MaxRows)
            .ToList();

        List<Guid> userIds = groups.SelectMany(g => new[] { g.Key.CourierId, g.Key.SettledByUserId ?? Guid.Empty }).Distinct().ToList();
        Dictionary<Guid, string> names = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        return Result<List<CourierHandoverHistoryDto>>.Success(groups.Select(g =>
        {
            var counted = g.FirstOrDefault(r => r.HandoverCountedCash is not null);
            return new CourierHandoverHistoryDto
            {
                SettledAt = g.Key.SettledAt,
                CourierUserId = g.Key.CourierId,
                CourierName = names.GetValueOrDefault(g.Key.CourierId, string.Empty),
                SettledByName = g.Key.SettledByUserId is Guid by ? names.GetValueOrDefault(by, string.Empty) : string.Empty,
                OrderCount = g.Count(),
                Numbers = g.Select(r => r.Number).Order().ToList(),
                ExpectedCash = g.Where(r => r.CollectedMethod == PaymentMethod.Nakit).Sum(r => r.CollectedAmount ?? 0m),
                CardAmount = g.Where(r => r.CollectedMethod is PaymentMethod.Kart or PaymentMethod.Iban).Sum(r => r.CollectedAmount ?? 0m),
                CountedCash = counted?.HandoverCountedCash,
                CashDifference = counted?.HandoverCashDifference
            };
        }).ToList());
    }
}
