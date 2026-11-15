using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity
{
    public class UpdateOrderItemQuantityCommandHandler : IRequestHandler<UpdateOrderItemQuantityCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public UpdateOrderItemQuantityCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(UpdateOrderItemQuantityCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders
                .Include(o => o.OrderItems)
                .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);

            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            // Adet artırmak sipariş almaktır, azaltmak gönderilmiş ürünü iptal etmektir.
            OrderItem? line = request.OrderItemId is Guid id
                ? order.OrderItems.FirstOrDefault(i => i.Id == id)
                : order.OrderItems.FirstOrDefault(i => i.ProductId == request.ProductId && !i.IsSetMenuComponent);
            int currentQuantity = line?.Quantity ?? 0;
            WaiterPermission permission = request.Quantity > currentQuantity ? WaiterPermission.TakeOrders : WaiterPermission.CancelAndDiscount;
            string? accessError = await _db.CheckOrderAccessAsync(_currentUserService, order, permission, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            if (request.OrderItemId is Guid orderItemId)
                order.UpdateOrderItemQuantity(orderItemId, request.Quantity);
            else
                order.UpdateItemQuantity(request.ProductId, request.Quantity);

            await _db.SaveChangesAsync(cancellationToken);

            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order, creator?.FullName ?? string.Empty);
            return Result.Success();
        }
    }
}
