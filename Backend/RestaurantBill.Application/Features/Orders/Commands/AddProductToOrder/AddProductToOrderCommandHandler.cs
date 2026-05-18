using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Application.Notification;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommandHandler : IRequestHandler<AddProductToOrderCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMediator _mediator;

        public AddProductToOrderCommandHandler(IUnitOfWork uow, IMediator mediator)
        {
            _uow = uow;
            _mediator = mediator;
        }

        public async Task Handle(AddProductToOrderCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            foreach (var item in request.OrderItems)
            {
                Product? product = await _uow.Product.GetByIdAsync(item.ProductId);
                Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");

                order.AddItem(product, item.Quantity);
            }

            await _uow.SaveChangesAsync(cancellationToken);

            await _mediator.Publish(new OrderUpdatedNotification(order), cancellationToken);
        }
    }
}