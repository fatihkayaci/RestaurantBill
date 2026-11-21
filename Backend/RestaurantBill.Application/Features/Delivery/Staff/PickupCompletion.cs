using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Payments;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Delivery.Staff;

// ── Gel al "Müşteri aldı": müşteri siparişi restoranda alır ve öder; tahsilat kasiyerin vardiyasına o anda geçer ─────
public class CompletePickupCommand : IRequest<Result>
{
    public Guid Id { get; set; }
    public Guid CashRegisterId { get; set; }
    public PaymentMethod Method { get; set; }
}

public class CompletePickupCommandValidator : AbstractValidator<CompletePickupCommand>
{
    public CompletePickupCommandValidator()
    {
        RuleFor(x => x.CashRegisterId).NotEqual(Guid.Empty).WithMessage("Ödemenin alınacağı kasayı seçin.");
        RuleFor(x => x.Method)
            .Must(m => m is PaymentMethod.Nakit or PaymentMethod.Kart or PaymentMethod.Iban).WithMessage("Tahsilat nakit, kart ya da IBAN olabilir.");
    }
}

/// <summary>
/// Kurye yoktur: teslim, tahsilat ve kasaya alma tek adımdır. Ürün ödemeleri (KDV oranı başına, satır kalemleriyle)
/// kasiyerin açık vardiyasına yazılır (Payment.UserId = işlemi yapan); nakit kasaya giriş hareketi olur. Teslimat ücreti
/// yoktur. Tutar hesabın kalanıdır: müşteri kasada ürün eklettiyse o da tahsil edilir. Tek SaveChanges.
/// </summary>
public class CompletePickupCommandHandler(
    IAppDbContext db,
    ICurrentUserService currentUser,
    ICashierNotificationService cashierNotifications,
    IKitchenNotificationService kitchenNotifications,
    TimeProvider clock)
    : IRequestHandler<CompletePickupCommand, Result>
{
    public const string NotPickupMessage = "Bu sipariş adrese teslim; kurye teslimiyle kapanır.";

    public async Task<Result> Handle(CompletePickupCommand request, CancellationToken cancellationToken)
    {
        var (delivery, error) = await DeliveryTransitions.LoadAsync(db, currentUser, request.Id, cancellationToken);
        if (delivery is null)
            return Result.Failure(error!);
        if (!delivery.IsPickup)
            return Result.Failure(NotPickupMessage);
        if (delivery.OrderId is not Guid orderId)
            return Result.Failure("Sipariş henüz onaylanmadı.");

        CashRegister? register = await db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.CashRegisterId && c.BranchId == delivery.BranchId, cancellationToken);
        if (register is null)
            return Result.Failure(HandoverCourierCashCommandHandler.RegisterNotFoundMessage);

        Shift? shift = await db.Shifts
            .FirstOrDefaultAsync(s => s.CashRegisterId == register.Id && s.Status == ShiftStatus.Open, cancellationToken);
        if (shift is null)
            return Result.Failure(HandoverCourierCashCommandHandler.NoOpenShiftMessage);

        // Ödeme ekranıyla aynı kural: kasiyer yalnızca kendi vardiyasındaki kasaya alır.
        if (currentUser.Role == "Cashier" && shift.OpenedByUserId != currentUser.UserId)
            return Result.Failure(HandoverCourierCashCommandHandler.NotOwnShiftMessage);

        Order? order = await db.Orders
            .Include(o => o.OrderItems).ThenInclude(i => i.Product).ThenInclude(p => p!.Category)
            .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu).ThenInclude(s => s!.Category)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);
        if (order is null || order.IsClosed())
            return Result.Failure("Siparişin hesabı bulunamadı ya da kapanmış.");

        var recorder = new PaymentRecorder(db);
        var target = new PaymentTarget(register, shift, request.Method, currentUser.UserId);
        decimal amount;
        try
        {
            List<(OrderItem Item, int Quantity)> lines = PaymentRecorder.BillLines(order).Select(i => (i, i.Quantity)).ToList();
            Dictionary<decimal, decimal> paidOnAccountByRate = await recorder.PaidOnAccountByRateAsync(order, cancellationToken);
            var recorded = recorder.RecordItems(order, lines, target, paidOnAccountByRate, PaymentDiscount.None);
            if (recorded.IsFailure)
                return Result.Failure(recorded.Error!);

            amount = recorded.Value.NetTotal;
            recorder.RecordCashIn(register, request.Method, amount, currentUser.UserId);

            delivery.CompletePickup(request.Method, amount, currentUser.UserId, clock.GetUtcNow().UtcDateTime);
            order.Close();
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        string actor = await db.ActorNameAsync(currentUser, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(delivery.BranchId, actor, AuditLogCategory.Payment, AuditLogSeverity.Info,
            "PickupOrderCompleted",
            $"{actor} online gel al sipariş #{delivery.Number}'i müşteriye verdi ({DeliveryScope.PaymentWord(request.Method)} ₺{amount:0.##}, {register.Name}).",
            nameof(DeliveryOrder), delivery.Id));

        await db.SaveChangesAsync(cancellationToken);

        await kitchenNotifications.SendOrdersChangedAsync(delivery.BranchId);
        await cashierNotifications.SendOrdersChangedAsync(delivery.BranchId);
        await cashierNotifications.SendDeliveryOrdersChangedAsync(delivery.BranchId,
            new DeliveryOrdersChangedDto { Id = delivery.Id, Status = delivery.Status });
        return Result.Success();
    }
}
