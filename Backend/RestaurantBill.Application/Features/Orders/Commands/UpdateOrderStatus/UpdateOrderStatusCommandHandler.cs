using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Features.Orders.ItemsReady;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus
{
    public class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;
        private readonly ICourierNotificationService? _courierNotificationService;

        // Kurye bildirimi isteğe bağlıdır (DI verir; testler vermeden kurabilir): sipariş Hazır olunca atanmış kuryenin ekranı yenilenir.
        public UpdateOrderStatusCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService,
            ICourierNotificationService? courierNotificationService = null)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
            _courierNotificationService = courierNotificationService;
        }

        public async Task<Result> Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders
                .Include(o => o.OrderItems).ThenInclude(i => i.Product)
                .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            // Garson bu uçtan siparişi iptal edemez ya da ödenmiş sayamaz; o işlerin kendi yetkisi var.
            WaiterPermission? permission = (OrderStatus)request.Status switch
            {
                OrderStatus.Cancelled => WaiterPermission.CancelAndDiscount,
                OrderStatus.Paid => WaiterPermission.TakePayment,
                _ => null
            };
            StaffAccess access = await _db.GetStaffAccessAsync(_currentUserService, cancellationToken);
            string? accessError = await _db.CheckOrderAccessAsync(access, order, permission, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            OrderStatus newStatus = (OrderStatus)request.Status;
            // Paket sipariş online sipariş akışından iptal edilir ve kasada "Teslim al" ile kapanır; buradan değil.
            if (!order.HasTable && newStatus is OrderStatus.Cancelled or OrderStatus.Paid)
                return Result.Failure("Paket sipariş online siparişler ekranından iptal edilir ya da kapatılır.");

            HashSet<Guid> notReadyBefore = ItemsReadyNotification.NotReadyItemIds(order);
            if (access.CategoryIds is null)
            {
                order.UpdateStatus(newStatus);
            }
            else
            {
                // Kategori atanmış mutfak "Tümü hazır" dediğinde yalnızca kendi kategorilerindeki ürünler ilerler;
                // siparişin durumu ancak bütün ürünler o aşamaya geldiyse değişir. İptal/ödeme gibi siparişin
                // tamamını etkileyen durumlar ona kapalıdır.
                if (!Order.IsItemTransitionStatus(newStatus))
                    return Result.Failure("Siparişin tamamını değiştiremezsiniz; yalnızca kendi kategorilerinizdeki ürünleri güncelleyebilirsiniz.");
                order.UpdateStatusForItems(newStatus, i => i.Product is not null && access.CanAccessCategory(i.Product.CategoryId));
            }

            DeliveryOrder? advancedDelivery = await _db.AdvanceDeliveryFromKitchenAsync(order, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);

            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order, creator?.FullName ?? string.Empty);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);
            await _db.SendItemsReadyAsync(_tableNotificationService, order, ItemsReadyNotification.NewlyReadyItemIds(order, notReadyBefore), cancellationToken);
            await _cashierNotificationService.NotifyDeliveryAdvancedAsync(advancedDelivery, _courierNotificationService);
            return Result.Success();
        }
    }
}
