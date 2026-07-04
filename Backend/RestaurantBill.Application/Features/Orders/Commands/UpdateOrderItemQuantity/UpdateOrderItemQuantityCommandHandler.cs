using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity
{
    public class UpdateOrderItemQuantityCommandHandler : IRequestHandler<UpdateOrderItemQuantityCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public UpdateOrderItemQuantityCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICurrentUserService currentUserService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
            _currentUserService = currentUserService;
        }
        /// <summary>
        /// Updates the quantity of a specific item in the order and recalculates the total price.
        /// Only items with Pending status can be updated.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if quantity is zero or less, order/item is not found, or item status is not Pending.</exception>
        public async Task Handle(UpdateOrderItemQuantityCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            order.UpdateItemQuantity(request.ProductId, request.Quantity);

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendOrderUpdatedAsync(_currentUserService.RestaurantId, order.TableId, order.TotalPrice);
        }
    }
}