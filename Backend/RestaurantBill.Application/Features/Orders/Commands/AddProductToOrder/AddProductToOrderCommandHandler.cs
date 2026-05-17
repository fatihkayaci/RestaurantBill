using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;

using MediatR;
using RestaurantBill.Domain.Enums;
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
        /// <summary>
        /// Adds one or more products to an existing order.
        /// If the product already exists in the order, its quantity is incremented.
        /// After saving, publishes a message to RabbitMQ to notify the kitchen.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if quantity is zero or less, or if the order/product is not found.</exception>
        public async Task Handle(AddProductToOrderCommand request, CancellationToken cancellationToken)
        {
            var order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            foreach (var item in request.OrderItems) 
            {
                if (item.Quantity <= 0) throw new BusinessException("Miktar 0'dan büyük olmalı!");

                var product = await _uow.Product.GetByIdAsync(item.ProductId);
                Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");


                var existingItem = order.OrderItems.FirstOrDefault(x => x.ProductId == item.ProductId && x.Status == OrderItemStatus.Pending);

                if (existingItem != null)
                {
                    existingItem.Quantity += item.Quantity;
                    existingItem.Product = product;
                }
                else
                {
                    var newItem = new OrderItem
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = product.Price,
                        Product = product
                    };
                    order.OrderItems.Add(newItem);
                }
            }

            order.TotalPrice = order.OrderItems.Sum(item => item.UnitPrice * item.Quantity);
            if (order.Status < OrderStatus.Preparing)
                order.Status = OrderStatus.Pending;

            await _uow.SaveChangesAsync(cancellationToken);

            await _mediator.Publish(new OrderUpdatedNotification(order), cancellationToken);
        }
    }
}