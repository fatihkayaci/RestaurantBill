using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Courier;

// ── Teslimi geri al: yanlış basılan "Nakit aldım / Kartla ödendi", kısa süre içinde ve kasaya teslim edilmeden ──
public class UndoDeliverDeliveryOrderCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class UndoDeliverDeliveryOrderCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications,
    ICourierNotificationService courierNotifications, TimeProvider clock)
    : IRequestHandler<UndoDeliverDeliveryOrderCommand, Result>
{
    public async Task<Result> Handle(UndoDeliverDeliveryOrderCommand request, CancellationToken cancellationToken)
    {
        Guid branch = Guid.Empty;
        Guid? courierId = null;
        string collected = string.Empty;
        Result result = await DeliveryTransitions.RunAsync(db, currentUser, notifications, request.Id,
            order =>
            {
                if (CourierOwnership.Check(currentUser, order) is { } denied)
                    return denied;
                collected = $"{(order.CollectedMethod == PaymentMethod.Nakit ? "nakit" : "kart")} ₺{order.CollectedAmount:0.##}";
                order.UndoDeliver(clock.GetUtcNow().UtcDateTime);
                branch = order.BranchId;
                courierId = order.CourierUserId;
                return null;
            },
            "DeliveryOrderDeliverUndone",
            (order, actor) => $"{actor} online paket sipariş #{order.Number}'in teslimini geri aldı ({collected}); sipariş yeniden yolda.",
            cancellationToken);

        await CourierOwnership.NotifyAsync(courierNotifications, result, branch, courierId, request.Id);
        return result;
    }
}

// ── Toplu yola çıkış: kuryenin üzerindeki hazır siparişlerin hepsi tek seferde ──────────────────────
public class DispatchCourierOrdersCommand : IRequest<Result<CourierBulkDispatchResultDto>>
{
    /// <summary>Kuryenin ekranında gördüğü hazır siparişler; ekran açıkken hazır olanı yanlışlıkla yola çıkarmamak için.</summary>
    public List<Guid> Ids { get; set; } = [];
}

public class DispatchCourierOrdersCommandValidator : AbstractValidator<DispatchCourierOrdersCommand>
{
    public const int MaxOrders = 20;

    public DispatchCourierOrdersCommandValidator()
    {
        RuleFor(x => x.Ids)
            .NotEmpty().WithMessage("Yola çıkarılacak sipariş seçin.")
            .Must(ids => ids.Count <= MaxOrders).WithMessage($"Tek seferde en fazla {MaxOrders} sipariş yola çıkabilir.");
    }
}

public class DispatchCourierOrdersCommandHandler(
    IAppDbContext db, ICurrentUserService currentUser, ICashierNotificationService notifications,
    ICourierNotificationService courierNotifications, TimeProvider clock)
    : IRequestHandler<DispatchCourierOrdersCommand, Result<CourierBulkDispatchResultDto>>
{
    public const string NothingReadyMessage = "Yola çıkarılacak hazır sipariş yok.";

    public async Task<Result<CourierBulkDispatchResultDto>> Handle(DispatchCourierOrdersCommand request, CancellationToken cancellationToken)
    {
        if (await DeliveryStaff.CheckAccessAsync(db, currentUser, cancellationToken) is { } denied)
            return Result<CourierBulkDispatchResultDto>.Failure(denied);

        List<Guid> ids = request.Ids.Where(id => id != Guid.Empty).Distinct().ToList();
        // Yalnızca kuryenin kendi siparişleri; başkasınınki ya da hazır olmayanı atlanır (sessizce değil, sonuçta sayılır).
        List<DeliveryOrder> orders = await db.DeliveryOrders
            .Mine(currentUser)
            .Where(d => ids.Contains(d.Id))
            .ToListAsync(cancellationToken);

        DateTime now = clock.GetUtcNow().UtcDateTime;
        List<DeliveryOrder> dispatched = [];
        foreach (DeliveryOrder order in orders.Where(o => o.Status == DeliveryOrderStatus.Ready).OrderBy(o => o.Number))
        {
            try
            {
                order.Dispatch(now);
                dispatched.Add(order);
            }
            catch (DomainException)
            {
                // Hazır değil ya da kurye yok: atlanır.
            }
        }

        if (dispatched.Count == 0)
            return Result<CourierBulkDispatchResultDto>.Failure(NothingReadyMessage);

        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        foreach (DeliveryOrder order in dispatched)
            db.AddAudit(order, actor, "DeliveryOrderDispatched", $"{actor} online paket sipariş #{order.Number}'i yola çıkardı (toplu).");
        await db.SaveChangesAsync(cancellationToken);

        foreach (DeliveryOrder order in dispatched)
            await notifications.SendDeliveryOrdersChangedAsync(order.BranchId, new DeliveryOrdersChangedDto { Id = order.Id, Status = order.Status });
        await courierNotifications.SendCourierOrdersChangedAsync(dispatched[0].BranchId, currentUser.UserId);

        return Result<CourierBulkDispatchResultDto>.Success(new CourierBulkDispatchResultDto
        {
            DispatchedCount = dispatched.Count,
            DispatchedNumbers = dispatched.Select(o => o.Number).ToList(),
            SkippedCount = ids.Count - dispatched.Count
        });
    }
}
