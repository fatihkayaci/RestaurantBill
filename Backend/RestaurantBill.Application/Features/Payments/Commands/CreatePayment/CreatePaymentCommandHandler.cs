using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, Result<bool>>
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

    public async Task<Result<bool>> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
        if (order is null)
            return Result<bool>.Failure("Böyle bir sipariş bulunamadı.");

        Table? table = await _uow.Table.GetByIdAsync(order.TableId, true);
        if (table is null)
            return Result<bool>.Failure("Böyle bir masa bulunamadı.");

        CashRegister? register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        if (register is null)
            return Result<bool>.Failure("Böyle bir kasa bulunamadı.");

        var paidItems = new List<(OrderItem Item, int Quantity)>();
        foreach (var requested in request.Items)
        {
            OrderItem? item = order.OrderItems.FirstOrDefault(i => i.Id == requested.OrderItemId);
            if (item is null)
                return Result<bool>.Failure("Ödenmek istenen bir ürün bu siparişte bulunamadı.");

            if (requested.Quantity > item.Quantity)
                return Result<bool>.Failure($"{item.Product?.Name} için ödenmek istenen miktar siparişteki miktardan fazla.");

            paidItems.Add((item, requested.Quantity));
        }

        decimal totalAmount = paidItems.Sum(p => p.Item.UnitPrice * p.Quantity);

        CashTransaction transaction = register.AddTransaction(CashTransactionType.In, totalAmount, _currentUserService.UserId);
        await _uow.CashTransaction.AddAsync(transaction);
        await _uow.CashRegister.UpdateAsync(register);

        var taxGroups = paidItems.GroupBy(p => p.Item.TaxRate);
        foreach (var group in taxGroups)
        {
            decimal groupTotal = group.Sum(p => p.Item.UnitPrice * p.Quantity);
            decimal groupMatrah = groupTotal / (1 + group.Key / 100);
            decimal groupTaxAmount = groupTotal - groupMatrah;

            Payment payment = Payment.Create(order.Id, register.Id, groupTotal, groupMatrah, groupTaxAmount, request.PaymentMethod);
            await _uow.Payment.AddAsync(payment);
        }

        foreach (var (item, quantity) in paidItems)
            order.SettleItem(item.Id, quantity);

        bool fullyPaid = order.OrderItems.Count == 0;
        if (fullyPaid)
        {
            order.Close();
            table.Release();
        }

        User? actor = await _uow.User.GetByIdAsync(_currentUserService.UserId);
        AuditLog log = AuditLog.Create(
            _currentUserService.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Payment,
            AuditLogSeverity.Info,
            "OrderPaid",
            fullyPaid
                ? $"{actor?.FullName} {table.Name} siparişini {request.PaymentMethod} ile kapattı (₺{totalAmount})."
                : $"{actor?.FullName} {table.Name} siparişinden {request.PaymentMethod} ile ₺{totalAmount} tutarında kısmi ödeme aldı.",
            nameof(Order),
            order.Id);
        await _uow.AuditLog.AddAsync(log);

        await _uow.SaveChangesAsync(cancellationToken);

        if (fullyPaid)
        {
            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            await _tableNotificationService.SendOrderClosedAsync(_currentUserService.BranchId, table.Id, order.Id);
        }
        else
        {
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, table.Id, order.TotalPrice, actor?.FullName ?? string.Empty);
        }
        await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);

        return Result<bool>.Success(fullyPaid);
    }
}
