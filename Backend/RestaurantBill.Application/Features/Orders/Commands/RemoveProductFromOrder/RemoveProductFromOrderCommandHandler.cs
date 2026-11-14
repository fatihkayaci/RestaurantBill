using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommandHandler : IRequestHandler<RemoveProductFromOrderCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public RemoveProductFromOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(RemoveProductFromOrderCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            Order? order = await _db.Orders
                .Include(o => o.OrderItems)
                .InBranches(branchIds).FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            string? accessError = await _db.CheckOrderAccessAsync(_currentUserService, order, WaiterPermission.CancelAndDiscount, cancellationToken);
            if (accessError is not null)
                return Result.Failure(accessError);

            if (request.OrderItemId is Guid orderItemId)
                order.RemoveOrderItem(orderItemId);
            else
                order.RemoveItem(request.ProductId);

            await _db.SaveChangesAsync(cancellationToken);

            User? creator = await _db.Users.FirstOrDefaultAsync(u => u.Id == order.CreatedUser, cancellationToken);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order, creator?.FullName ?? string.Empty);
            return Result.Success();
        }
    }
}
