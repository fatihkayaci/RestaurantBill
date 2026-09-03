using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, Result<bool>>
{
    private readonly IAppDbContext _db;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;

    public CreatePaymentCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _db = db;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        Order? order = await _db.Orders
            .Include(o => o.OrderItems).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
        if (order is null)
            return Result<bool>.Failure("Böyle bir sipariş bulunamadı.");

        Table? table = await _db.Tables
            .FirstOrDefaultAsync(t => t.Id == order.TableId, cancellationToken);
        if (table is null)
            return Result<bool>.Failure("Böyle bir masa bulunamadı.");

        CashRegister? register = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.CashRegisterId, cancellationToken);
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

        decimal discountAmount = request.DiscountPercent.HasValue
            ? Math.Round(totalAmount * request.DiscountPercent.Value / 100m, 2, MidpointRounding.AwayFromZero)
            : request.DiscountAmount ?? 0m;

        if (discountAmount > totalAmount)
            return Result<bool>.Failure("İskonto tutarı ödenecek toplam tutardan fazla olamaz.");

        decimal netTotal = totalAmount - discountAmount;

        if (request.PaymentMethod == PaymentMethod.Nakit)
        {
            CashTransaction transaction = register.AddTransaction(CashTransactionType.In, netTotal, _currentUserService.UserId);
            _db.CashTransactions.Add(transaction);
        }

        var taxGroups = paidItems.GroupBy(p => p.Item.TaxRate).OrderBy(g => g.Key).ToList();
        decimal discountAllocated = 0m;
        for (int idx = 0; idx < taxGroups.Count; idx++)
        {
            var group = taxGroups[idx];
            decimal groupGrossTotal = group.Sum(p => p.Item.UnitPrice * p.Quantity);
            decimal groupDiscount = idx == taxGroups.Count - 1
                ? discountAmount - discountAllocated
                : Math.Round(discountAmount * (totalAmount == 0 ? 0 : groupGrossTotal / totalAmount), 2, MidpointRounding.AwayFromZero);
            discountAllocated += groupDiscount;

            decimal groupNetTotal = groupGrossTotal - groupDiscount;
            decimal groupMatrah = groupNetTotal / (1 + group.Key / 100);
            decimal groupTaxAmount = groupNetTotal - groupMatrah;

            int groupItemCount = group.Sum(p => p.Quantity);
            Payment payment = Payment.Create(order.Id, register.Id, groupNetTotal, groupMatrah, groupTaxAmount, request.PaymentMethod, groupItemCount,
                groupDiscount, request.DiscountPercent, request.DiscountNote);
            _db.Payments.Add(payment);
        }

        foreach (var (item, quantity) in paidItems)
            order.SettleItem(item.Id, quantity);

        bool fullyPaid = order.OrderItems.Count == 0;
        if (fullyPaid)
        {
            order.Close();
            table.Release();
        }

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId, cancellationToken);
        string discountLogFragment = discountAmount > 0 ? $" (₺{discountAmount} iskonto uygulandı)" : string.Empty;
        AuditLog log = AuditLog.Create(
            _currentUserService.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Payment,
            AuditLogSeverity.Info,
            "OrderPaid",
            fullyPaid
                ? $"{actor?.FullName} {table.Name} siparişini {request.PaymentMethod} ile kapattı (₺{netTotal}).{discountLogFragment}"
                : $"{actor?.FullName} {table.Name} siparişinden {request.PaymentMethod} ile ₺{netTotal} tutarında kısmi ödeme aldı.{discountLogFragment}",
            nameof(Order),
            order.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);

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
