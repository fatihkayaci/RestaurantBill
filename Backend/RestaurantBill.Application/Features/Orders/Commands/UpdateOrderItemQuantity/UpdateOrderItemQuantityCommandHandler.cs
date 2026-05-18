using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemQuantity
{
    public class UpdateOrderItemQuantityCommandHandler : IRequestHandler<UpdateOrderItemQuantityCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateOrderItemQuantityCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
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
        }
    }
}