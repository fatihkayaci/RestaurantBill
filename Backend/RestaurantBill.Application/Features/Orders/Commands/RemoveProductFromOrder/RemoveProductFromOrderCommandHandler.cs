using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Orders.Commands.RemoveProductFromOrder
{
    public class RemoveProductFromOrderCommandHandler : IRequestHandler<RemoveProductFromOrderCommand>
    {
        private readonly IUnitOfWork _uow;

        public RemoveProductFromOrderCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Removes a specific product from the order and recalculates the total price.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if the order or the product within the order is not found.</exception>
        public async Task Handle(RemoveProductFromOrderCommand request, CancellationToken cancellationToken)
        { 
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            order.RemoveItem(request.ProductId);

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}