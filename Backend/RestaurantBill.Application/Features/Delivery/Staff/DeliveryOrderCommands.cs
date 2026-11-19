using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Staff;

// Personelin paket sipariş geçişleri. Her geçiş denetim kaydı yazar ve "DeliveryOrdersChanged" yollar.
internal static class DeliveryTransitions
{
    public static async Task<(DeliveryOrder? Order, string? Error)> LoadAsync(
        IAppDbContext db, ICurrentUserService currentUser, Guid id, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return (null, denied);

        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        DeliveryOrder? order = await db.DeliveryOrders
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == id && branchIds.Contains(d.BranchId) && !d.IsDeleted, cancellationToken);
        return order is null ? (null, DeliveryScope.NotFoundMessage) : (order, null);
    }

    /// <summary>Basit geçiş: yükle → uygula (DomainException kullanıcı mesajı olur) → denetim kaydı → kaydet → bildir.</summary>
    public static async Task<Result> RunAsync(
        IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications, Guid id,
        Func<DeliveryOrder, string?> apply, string action, Func<DeliveryOrder, string, string> describe, CancellationToken cancellationToken)
    {
        var (order, error) = await LoadAsync(db, currentUser, id, cancellationToken);
        if (order is null)
            return Result.Failure(error!);

        try
        {
            string? applyError = apply(order);
            if (applyError is not null)
                return Result.Failure(applyError);
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AddAudit(order, actor, action, describe(order, actor));
        await db.SaveChangesAsync(cancellationToken);

        await notifications.SendDeliveryOrdersChangedAsync(order.BranchId, new DeliveryOrdersChangedDto { Id = order.Id, Status = order.Status });
        return Result.Success();
    }
}

// ── Kabul: mutfak siparişi (Order) açılır, satırlar müşterinin onayladığı fiyatlarla yazılır ─────────
public class AcceptDeliveryOrderCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    /// <summary>Müşteriye söylenen teslim süresi (dakika). Boşsa bölgenin süresi, o da yoksa şube varsayılanı.</summary>
    public int? EtaMinutes { get; set; }
}

public class AcceptDeliveryOrderCommandValidator : AbstractValidator<AcceptDeliveryOrderCommand>
{
    public AcceptDeliveryOrderCommandValidator()
    {
        RuleFor(x => x.EtaMinutes)
            .InclusiveBetween(DeliveryZone.EstimatedMinutesMin, DeliveryZone.EstimatedMinutesMax)
            .When(x => x.EtaMinutes is not null)
            .WithMessage($"Tahmini süre {DeliveryZone.EstimatedMinutesMin}–{DeliveryZone.EstimatedMinutesMax} dakika arasında olmalı.");
    }
}

public class AcceptDeliveryOrderCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    ICashierNotificationService cashierNotifications,
    IKitchenNotificationService kitchenNotifications,
    TimeProvider clock)
    : IRequestHandler<AcceptDeliveryOrderCommand, Result>
{
    public async Task<Result> Handle(AcceptDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        var (delivery, error) = await DeliveryTransitions.LoadAsync(db, currentUser, request.Id, cancellationToken);
        if (delivery is null)
            return Result.Failure(error!);
        if (delivery.Status != DeliveryOrderStatus.Received)
            return Result.Failure("Bu sipariş zaten yanıtlandı.");

        int eta = request.EtaMinutes ?? await SuggestedEtaAsync(delivery, cancellationToken);

        Order order = Order.CreateDelivery(delivery.BranchId, delivery.DeliveryFee, delivery.Note);

        List<Guid> productIds = delivery.Lines.Where(l => l.ProductId is not null).Select(l => l.ProductId!.Value).Distinct().ToList();
        Dictionary<Guid, Product> products = await db.Products
            .Include(p => p.Category).ThenInclude(c => c.Branch)
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        List<Guid> setMenuIds = delivery.Lines.Where(l => l.SetMenuId is not null).Select(l => l.SetMenuId!.Value).Distinct().ToList();
        Dictionary<Guid, SetMenu> setMenus = await db.SetMenus
            .Include(s => s.Category)
            .Include(s => s.Slots).ThenInclude(slot => slot.Options).ThenInclude(o => o.Product)
            .Where(s => setMenuIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, cancellationToken);

        try
        {
            foreach (DeliveryOrderLine line in delivery.Lines.OrderBy(l => l.CreatedAt))
            {
                if (line.Kind == DeliveryOrderLineKind.SetMenu)
                {
                    if (line.SetMenuId is not Guid setMenuId || !setMenus.TryGetValue(setMenuId, out SetMenu? setMenu) || setMenu.IsDeleted)
                        return Result.Failure(MissingLineMessage(line));
                    order.AddSetMenuAtPrice(setMenu, DeliveryScope.ParseSelections(line.SelectionsJson), line.UnitPrice, line.Quantity, line.TaxRate, line.Note);
                }
                else
                {
                    if (line.ProductId is not Guid productId || !products.TryGetValue(productId, out Product? product) || product.IsDeleted)
                        return Result.Failure(MissingLineMessage(line));
                    order.AddItemAtPrice(product, line.UnitPrice, line.Quantity, line.TaxRate, line.Note);
                }
            }

            delivery.Accept(order, eta, currentUser.UserId, clock.GetUtcNow().UtcDateTime);
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        db.Orders.Add(order);
        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AddAudit(delivery, actor, "DeliveryOrderAccepted", $"{actor} online paket sipariş #{delivery.Number}'i kabul etti ({eta} dk).");
        await db.SaveChangesAsync(cancellationToken);

        // Masa siparişinin açılışındaki gibi: mutfak ve kasa listelerini yeniler; ayrıca online sipariş ekranları.
        await kitchenNotifications.SendOrdersChangedAsync(delivery.BranchId);
        await cashierNotifications.SendOrdersChangedAsync(delivery.BranchId);
        await cashierNotifications.SendDeliveryOrdersChangedAsync(delivery.BranchId,
            new DeliveryOrdersChangedDto { Id = delivery.Id, Status = delivery.Status });
        return Result.Success();
    }

    private async Task<int> SuggestedEtaAsync(DeliveryOrder delivery, CancellationToken cancellationToken)
    {
        int? zoneEta = delivery.DeliveryZoneId is Guid zoneId
            ? await db.DeliveryZones.AsNoTracking().Where(z => z.Id == zoneId).Select(z => (int?)z.EstimatedMinutes).FirstOrDefaultAsync(cancellationToken)
            : null;
        if (zoneEta is int eta)
            return eta;

        Branch branch = await db.Branches.AsNoTracking().FirstAsync(b => b.Id == delivery.BranchId, cancellationToken);
        return branch.GetOnlineOrderSettings().DefaultEtaMinutes;
    }

    private static string MissingLineMessage(DeliveryOrderLine line)
        => $"{line.NameSnapshot} artık menüde yok. Siparişi reddedip müşteriye haber verin.";
}

// ── Red: yalnızca yanıtlanmamış sipariş; neden müşteriye gösterilir ──────────────────────────────
public class RejectDeliveryOrderCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class RejectDeliveryOrderCommandValidator : AbstractValidator<RejectDeliveryOrderCommand>
{
    public RejectDeliveryOrderCommandValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Müşteriye gösterilecek ret nedenini yazın.")
            .MaximumLength(DeliveryOrder.ReasonMaxLength).WithMessage($"Neden en fazla {DeliveryOrder.ReasonMaxLength} karakter olabilir.");
    }
}

public class RejectDeliveryOrderCommandHandler(IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications, TimeProvider clock)
    : IRequestHandler<RejectDeliveryOrderCommand, Result>
{
    public Task<Result> Handle(RejectDeliveryOrderCommand request, CancellationToken cancellationToken)
        => DeliveryTransitions.RunAsync(db, currentUser, notifications, request.Id,
            order =>
            {
                order.Reject(request.Reason, currentUser.UserId, clock.GetUtcNow().UtcDateTime);
                return null;
            },
            "DeliveryOrderRejected",
            (order, actor) => $"{actor} online paket sipariş #{order.Number}'i reddetti: {order.RejectReason}",
            cancellationToken);
}

// ── Personel iptali: kabul edilmiş siparişte bağlı mutfak siparişi de iptal edilir ────────────────
public class CancelDeliveryOrderCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class CancelDeliveryOrderCommandValidator : AbstractValidator<CancelDeliveryOrderCommand>
{
    public CancelDeliveryOrderCommandValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("İptal nedenini yazın.")
            .MaximumLength(DeliveryOrder.ReasonMaxLength).WithMessage($"Neden en fazla {DeliveryOrder.ReasonMaxLength} karakter olabilir.");
    }
}

public class CancelDeliveryOrderCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    ICashierNotificationService cashierNotifications,
    IKitchenNotificationService kitchenNotifications,
    ICourierNotificationService courierNotifications,
    TimeProvider clock)
    : IRequestHandler<CancelDeliveryOrderCommand, Result>
{
    public async Task<Result> Handle(CancelDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        var (delivery, error) = await DeliveryTransitions.LoadAsync(db, currentUser, request.Id, cancellationToken);
        if (delivery is null)
            return Result.Failure(error!);
        if (delivery.Status == DeliveryOrderStatus.Received)
            return Result.Failure("Yanıtlanmamış sipariş iptal edilmez; nedenini yazıp reddedin.");

        // Masa siparişinin iptal ucu (/order/cancel) masasız siparişi reddeder; bağlı sipariş burada doğrudan iptal edilir.
        Order? order = delivery.OrderId is Guid orderId
            ? await db.Orders.FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken)
            : null;

        try
        {
            delivery.CancelByStaff(request.Reason, currentUser.UserId, clock.GetUtcNow().UtcDateTime);
            if (order is not null && !order.IsClosed())
                order.Cancel();
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AddAudit(delivery, actor, "DeliveryOrderCancelled",
            $"{actor} online paket sipariş #{delivery.Number}'i iptal etti: {delivery.CancelReason}", AuditLogSeverity.Warning);
        await db.SaveChangesAsync(cancellationToken);

        await kitchenNotifications.SendOrdersChangedAsync(delivery.BranchId);
        await cashierNotifications.SendOrdersChangedAsync(delivery.BranchId);
        await cashierNotifications.SendDeliveryOrdersChangedAsync(delivery.BranchId,
            new DeliveryOrdersChangedDto { Id = delivery.Id, Status = delivery.Status });
        // İptal edilen sipariş kuryenin ekranından düşer.
        if (delivery.CourierUserId is Guid courierId)
            await courierNotifications.SendCourierOrdersChangedAsync(delivery.BranchId, courierId, delivery.Id);
        return Result.Success();
    }
}

// ── Kurye atama: şubenin aktif kuryesi; null atamayı kaldırır ───────────────────────────────────
public class AssignCourierCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    public Guid? CourierUserId { get; set; }
}

public class AssignCourierCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications, ICourierNotificationService courierNotifications)
    : IRequestHandler<AssignCourierCommand, Result>
{
    public const string CourierNotInBranchMessage = "Bu kurye bu şubede çalışmıyor ya da pasif.";

    public async Task<Result> Handle(AssignCourierCommand request, CancellationToken cancellationToken)
    {
        string courierName = string.Empty;
        if (request.CourierUserId is Guid courierId && courierId != Guid.Empty)
        {
            // Kurye şubeye bağlıdır: siparişin şubesinde Courier rolüyle aktif üyeliği olmalı.
            Guid? branchId = await db.DeliveryOrders.AsNoTracking()
                .Where(d => d.Id == request.Id)
                .Select(d => (Guid?)d.BranchId)
                .FirstOrDefaultAsync(cancellationToken);

            string? name = branchId is null ? null : await db.UserBranches.AsNoTracking()
                .Where(ub => ub.UserId == courierId && ub.BranchId == branchId && ub.Role == UserRole.Courier
                    && ub.IsActive && !ub.IsDeleted && ub.User.IsActive && !ub.User.IsDeleted)
                .Select(ub => ub.User.FullName)
                .FirstOrDefaultAsync(cancellationToken);
            if (branchId is not null && name is null)
                return Result.Failure(CourierNotInBranchMessage);
            courierName = name ?? string.Empty;
        }

        // Atama değişince hem önceki hem yeni kuryenin ekranı yenilenir.
        Guid branch = Guid.Empty;
        Guid? previousCourierId = null;
        Guid? newCourierId = null;
        Result result = await DeliveryTransitions.RunAsync(db, currentUser, notifications, request.Id,
            order =>
            {
                branch = order.BranchId;
                previousCourierId = order.CourierUserId;
                if (request.CourierUserId is Guid id && id != Guid.Empty)
                    order.AssignCourier(id);
                else
                    order.UnassignCourier();
                newCourierId = order.CourierUserId;
                return null;
            },
            "DeliveryOrderCourierAssigned",
            (order, actor) => order.CourierUserId is null
                ? $"{actor} online paket sipariş #{order.Number}'in kuryesini kaldırdı."
                : $"{actor} online paket sipariş #{order.Number}'i {courierName} kuryesine atadı.",
            cancellationToken);

        if (result.IsSuccess)
        {
            foreach (Guid notifiedCourierId in new[] { previousCourierId, newCourierId }.OfType<Guid>().Distinct())
                await courierNotifications.SendCourierOrdersChangedAsync(branch, notifiedCourierId, request.Id);
        }
        return result;
    }
}

// ── Yola çıkış ve teslim: kurye kendi ekranından (api/courier) ya da personel kurye adına işaretler ─────
public static class CourierOwnership
{
    public const string NotYoursMessage = "Bu sipariş size atanmamış.";

    /// <summary>Kurye yalnızca kendisine atanmış siparişi ilerletir; personel (kasiyer, yönetici) her siparişi.</summary>
    public static string? Check(ICurrentUserService currentUser, DeliveryOrder order)
        => currentUser.Role == "Courier" && order.CourierUserId != currentUser.UserId ? NotYoursMessage : null;

    /// <summary>Geçiş başarılıysa siparişin kuryesine (kendi diğer cihazları dahil) haber verir.</summary>
    public static async Task NotifyAsync(ICourierNotificationService notifications, Result result, Guid branchId, Guid? courierId, Guid deliveryOrderId)
    {
        if (result.IsSuccess && courierId is Guid id)
            await notifications.SendCourierOrdersChangedAsync(branchId, id, deliveryOrderId);
    }
}

public class DispatchDeliveryOrderCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class DispatchDeliveryOrderCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications,
    ICourierNotificationService courierNotifications, TimeProvider clock)
    : IRequestHandler<DispatchDeliveryOrderCommand, Result>
{
    public async Task<Result> Handle(DispatchDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        Guid branch = Guid.Empty;
        Guid? courierId = null;
        Result result = await DeliveryTransitions.RunAsync(db, currentUser, notifications, request.Id,
            order =>
            {
                if (CourierOwnership.Check(currentUser, order) is { } denied)
                    return denied;
                order.Dispatch(clock.GetUtcNow().UtcDateTime);
                branch = order.BranchId;
                courierId = order.CourierUserId;
                return null;
            },
            "DeliveryOrderDispatched",
            (order, actor) => $"{actor} online paket sipariş #{order.Number}'i yola çıkardı.",
            cancellationToken);

        await CourierOwnership.NotifyAsync(courierNotifications, result, branch, courierId, request.Id);
        return result;
    }
}

/// <summary>
/// Teslim ve tahsilat kaydı (nakit/kart; IBAN tercihli siparişte IBAN). Kasaya geçmesi ve siparişin kapanması kasiyerin
/// "Teslim al"ıyla olur.
/// </summary>
public class DeliverDeliveryOrderCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    public PaymentMethod Method { get; set; }
}

public class DeliverDeliveryOrderCommandValidator : AbstractValidator<DeliverDeliveryOrderCommand>
{
    public DeliverDeliveryOrderCommandValidator()
    {
        RuleFor(x => x.Method)
            .Must(m => m is PaymentMethod.Nakit or PaymentMethod.Kart or PaymentMethod.Iban).WithMessage("Tahsilat nakit, kart ya da IBAN olabilir.");
    }
}

public class DeliverDeliveryOrderCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications,
    ICourierNotificationService courierNotifications, TimeProvider clock)
    : IRequestHandler<DeliverDeliveryOrderCommand, Result>
{
    public async Task<Result> Handle(DeliverDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        Guid branch = Guid.Empty;
        Guid? courierId = null;
        Result result = await DeliveryTransitions.RunAsync(db, currentUser, notifications, request.Id,
            order =>
            {
                if (CourierOwnership.Check(currentUser, order) is { } denied)
                    return denied;
                order.Deliver(request.Method, clock.GetUtcNow().UtcDateTime);
                branch = order.BranchId;
                courierId = order.CourierUserId;
                return null;
            },
            "DeliveryOrderDelivered",
            (order, actor) => $"{actor} online paket sipariş #{order.Number}'i teslim edildi olarak işaretledi " +
                              $"({DeliveryScope.PaymentWord(order.CollectedMethod)} ₺{order.CollectedAmount:0.##}).",
            cancellationToken);

        await CourierOwnership.NotifyAsync(courierNotifications, result, branch, courierId, request.Id);
        return result;
    }
}

// ── Kasanın "Online siparişi durdur" anahtarı ───────────────────────────────────────────────────
public class SetOnlineOrderingPausedCommand : IRequest<Result<OnlineOrderingPauseDto>>
{
    public Guid? BranchId { get; set; }
    public bool Paused { get; set; }
}

public class SetOnlineOrderingPausedCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<SetOnlineOrderingPausedCommand, Result<OnlineOrderingPauseDto>>
{
    public async Task<Result<OnlineOrderingPauseDto>> Handle(SetOnlineOrderingPausedCommand request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Result<OnlineOrderingPauseDto>.Failure(denied);

        var (branchId, error) = await DeliveryStaff.ResolveSingleBranchAsync(db, currentUser, request.BranchId, cancellationToken);
        if (error is not null)
            return Result<OnlineOrderingPauseDto>.Failure(error);

        Branch branch = await db.Branches.FirstAsync(b => b.Id == branchId, cancellationToken);
        if (branch.OnlineOrdersPaused != request.Paused)
        {
            branch.SetOnlineOrdersPaused(request.Paused);
            string actor = await db.ActorNameAsync(currentUser, cancellationToken);
            db.AuditLogs.Add(AuditLog.Create(branch.Id, actor, AuditLogCategory.System, AuditLogSeverity.Info,
                request.Paused ? "OnlineOrderingPaused" : "OnlineOrderingResumed",
                request.Paused ? $"{actor} {branch.BranchName} şubesinde online siparişi durdurdu." : $"{actor} {branch.BranchName} şubesinde online siparişi yeniden açtı.",
                nameof(Branch), branch.Id));
            await db.SaveChangesAsync(cancellationToken);
        }

        return Result<OnlineOrderingPauseDto>.Success(new OnlineOrderingPauseDto
        {
            BranchId = branch.Id,
            Paused = branch.OnlineOrdersPaused,
            Enabled = branch.GetOnlineOrderSettings().Enabled
        });
    }
}
