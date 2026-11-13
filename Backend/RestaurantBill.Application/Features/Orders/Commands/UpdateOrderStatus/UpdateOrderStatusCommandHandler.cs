using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
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

        public UpdateOrderStatusCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
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
            string? accessError = await _db.CheckTableAccessAsync(access, order.TableId, permission, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            OrderStatus newStatus = (OrderStatus)request.Status;
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
                order.UpdateStatusForItems(newStatus, i => access.CanAccessCategory(i.Product.CategoryId));
            }

            await _db.SaveChangesAsync(cancellationToken);

            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order.TableId, order.TotalPrice, creator?.FullName ?? string.Empty);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.BranchId);
            return Result.Success();
        }
    }
}
