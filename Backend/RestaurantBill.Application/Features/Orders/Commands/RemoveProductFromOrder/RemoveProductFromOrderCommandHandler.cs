using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommandHandler : IRequestHandler<RemoveProductFromOrderCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public RemoveProductFromOrderCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }
        /// <summary>
        /// Removes a specific product from the order and recalculates the total price.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if the order or the product within the order is not found.</exception>
        public async Task<Result> Handle(RemoveProductFromOrderCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            if (order is null)
                return Result.Failure("Böyle bir sipariş bulunamadı.");

            order.RemoveItem(request.ProductId);

            await _uow.SaveChangesAsync(cancellationToken);

            User? creator = await _uow.User.GetByIdAsync(order.CreatedUser);
            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.BranchId, order.TableId, order.TotalPrice, creator?.FullName ?? string.Empty);
            return Result.Success();
        }
    }
}