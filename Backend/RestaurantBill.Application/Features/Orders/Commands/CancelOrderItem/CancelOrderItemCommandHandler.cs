using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrderItem
{
    public class CancelOrderItemCommandHandler : IRequestHandler<CancelOrderItemCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public CancelOrderItemCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(CancelOrderItemCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders
                .Include(o => o.OrderItems).ThenInclude(i => i.Product)
                .Include(o => o.OrderItems).ThenInclude(i => i.SetMenu)
                .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            // Siparişin tamamını iptal etmekle aynı yetki: garsonda "İptal ve indirim" açık olmalı.
            string? accessError = await _db.CheckOrderAccessAsync(_currentUserService, order, WaiterPermission.CancelAndDiscount, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            // Siparişin tamamının iptali gibi yalnızca masa siparişinde; paket siparişin içeriği kendi akışından yönetilir.
            if (!order.HasTable)
                return Result.Failure(Order.TableOnlyMessage);

            OrderItem line = order.CancelOrderItem(request.OrderItemId, request.Quantity);
            string lineName = line.IsSetMenu ? line.SetMenu?.Name ?? "Menü" : line.Product?.Name ?? "Ürün";

            Table? table = await _db.Tables.FirstOrDefaultAsync(t => t.Id == order.TableId, cancellationToken);
            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUserService.UserId, cancellationToken);
            string reason = request.Reason?.Trim() ?? string.Empty;
            AuditLog log = AuditLog.Create(
                _currentUserService.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Order,
                AuditLogSeverity.Warning,
                "OrderItemCancelled",
                $"{actor?.FullName} {table?.Name} siparişinden {request.Quantity} adet {lineName} iptal etti (₺{line.UnitPrice * request.Quantity:0.##})."
                    + (reason.Length > 0 ? $" Neden: {reason}" : string.Empty),
                nameof(Order),
                order.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);

            // Mutfak, garson ve yönetici ekranları "OrderUpdated" ile siparişi yeniden çeker; kasiyer listesi ayrıca yenilenir.
            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order, creator?.FullName ?? string.Empty);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);
            return Result.Success();
        }
    }
}
