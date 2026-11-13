using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder
{
    public class CloseOrderCommandHandler : IRequestHandler<DeleteCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public CloseOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(DeleteCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders.InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);

            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            string? accessError = await _db.CheckTableAccessAsync(_currentUserService, order.TableId, WaiterPermission.TakePayment, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            Table? table = await _db.Tables.FirstOrDefaultAsync(t => t.Id == order.TableId, cancellationToken);

            if (table is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            // Ödemesiz kapatma, tutar girerek alınmış ödemeyi ürünlere mahsup etmeden siler; kalan ödeme ekranından alınır.
            if (order.PaidOnAccount > 0)
                return Result.Failure("Bu hesaptan tutar girilerek ödeme alınmış. Kalan tutarı ödeme ekranından alarak hesabı kapatın.");

            order.Close();
            table.Release();

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUserService.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Order,
                AuditLogSeverity.Info,
                "OrderPaid",
                $"{actor?.FullName} {table.Name} siparişini kapattı (₺{order.TotalPrice}).",
                nameof(Order),
                order.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.BranchId, table.Id, (int)table.Status);
            await _tableNotificationService.SendOrderClosedAsync(_currentUserService.BranchId, table.Id, order.Id);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);
            return Result.Success();
        }
    }
}
