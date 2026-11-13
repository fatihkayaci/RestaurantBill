using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrder
{
    public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public CancelOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(CancelOrderCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders.InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            string? accessError = await _db.CheckTableAccessAsync(_currentUserService, order.TableId, WaiterPermission.CancelAndDiscount, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            Table? table = await _db.Tables.FirstOrDefaultAsync(t => t.Id == order.TableId, cancellationToken);
            if (table is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            // Tutar girerek ödeme alınmış hesap iptal edilemez: alınan para kasada/raporda kalır, iade akışı yok.
            if (order.PaidOnAccount > 0)
                return Result.Failure($"Bu hesaptan ₺{order.PaidOnAccount:0.##} ödeme alınmış, sipariş iptal edilemez. Kalan tutarı tahsil edip hesabı kapatın.");

            order.Cancel();
            table.Release();

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUserService.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Order,
                AuditLogSeverity.Warning,
                "OrderCancelled",
                $"{actor?.FullName} {table.Name} siparişini iptal etti.",
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
