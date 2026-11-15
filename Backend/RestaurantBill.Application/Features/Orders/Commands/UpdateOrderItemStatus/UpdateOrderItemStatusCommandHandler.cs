using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Orders.ItemsReady;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemStatus
{
    public class UpdateOrderItemStatusCommandHandler : IRequestHandler<UpdateOrderItemStatusCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;
        private readonly ICourierNotificationService? _courierNotificationService;

        // Kurye bildirimi isteğe bağlıdır (DI verir; testler vermeden kurabilir): sipariş Hazır olunca atanmış kuryenin ekranı yenilenir.
        public UpdateOrderItemStatusCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService,
            ICourierNotificationService? courierNotificationService = null)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
            _courierNotificationService = courierNotificationService;
        }

        public async Task<Result> Handle(UpdateOrderItemStatusCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders
                .Include(o => o.OrderItems)
                .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            // Garson: masanın bölgesi; kategori atanmış mutfak: ürünün kategorisi.
            StaffAccess access = await _db.GetStaffAccessAsync(_currentUserService, cancellationToken);
            string? accessError = await _db.CheckOrderAccessAsync(access, order, null, cancellationToken)
                ?? await _db.CheckOrderItemCategoryAsync(access, request.OrderItemId, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            HashSet<Guid> notReadyBefore = ItemsReadyNotification.NotReadyItemIds(order);
            order.UpdateItemStatus(request.OrderItemId, (OrderItemStatus)request.Status);

            DeliveryOrder? advancedDelivery = await _db.AdvanceDeliveryFromKitchenAsync(order, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);

            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order, creator?.FullName ?? string.Empty);
            await _db.SendItemsReadyAsync(_tableNotificationService, order, ItemsReadyNotification.NewlyReadyItemIds(order, notReadyBefore), cancellationToken);
            await _cashierNotificationService.NotifyDeliveryAdvancedAsync(advancedDelivery, _courierNotificationService);
            return Result.Success();
        }
    }
}
