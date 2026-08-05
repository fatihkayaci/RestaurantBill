using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, Result>
{
    private readonly IUnitOfWork _uow;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;

    public CreatePaymentCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _uow = uow;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
        if (order is null)
            return Result.Failure("Böyle bir sipariş bulunamadı.");

        Table? table = await _uow.Table.GetByIdAsync(order.TableId, true);
        if (table is null)
            return Result.Failure("Böyle bir masa bulunamadı.");

        CashRegister? register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        if (register is null)
            return Result.Failure("Böyle bir kasa bulunamadı.");

        decimal totalAmount = order.TotalPrice;

        order.Close();
        table.Release();

        CashTransaction transaction = register.AddTransaction(CashTransactionType.In, totalAmount, _currentUserService.UserId);
        await _uow.CashTransaction.AddAsync(transaction);
        await _uow.CashRegister.UpdateAsync(register);

        var taxGroups = order.OrderItems.GroupBy(i => i.TaxRate);
        foreach (var group in taxGroups)
        {
            decimal groupTotal = group.Sum(i => i.UnitPrice * i.Quantity);
            decimal groupMatrah = groupTotal / (1 + group.Key / 100);
            decimal groupTaxAmount = groupTotal - groupMatrah;

            Payment payment = Payment.Create(order.Id, register.Id, groupTotal, groupMatrah, groupTaxAmount, request.PaymentMethod);
            await _uow.Payment.AddAsync(payment);
        }

        User? actor = await _uow.User.GetByIdAsync(_currentUserService.UserId);
        AuditLog log = AuditLog.Create(
            _currentUserService.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Payment,
            AuditLogSeverity.Info,
            "OrderPaid",
            $"{actor?.FullName} {table.Name} siparişini {request.PaymentMethod} ile kapattı (₺{totalAmount}).",
            nameof(Order),
            order.Id);
        await _uow.AuditLog.AddAsync(log);

        await _uow.SaveChangesAsync(cancellationToken);

        await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
        await _tableNotificationService.SendOrderClosedAsync(_currentUserService.BranchId, table.Id, order.Id);
        await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);

        return Result.Success();
    }
}
