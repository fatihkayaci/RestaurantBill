using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;

using AutoMapper;
using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommandHandler : IRequestHandler<AddProductToOrderCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public AddProductToOrderCommandHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
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

                var existingItem = order.OrderItems.FirstOrDefault(x => x.ProductId == item.ProductId);

                if (existingItem != null) existingItem.Quantity += item.Quantity;
                else
                {
                    var newItem = new OrderItem
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = product.Price
                    };
                    order.OrderItems.Add(newItem);
                }
            }

            order.TotalPrice = order.OrderItems.Sum(item => item.UnitPrice * item.Quantity);

            await _uow.SaveChangesAsync(cancellationToken);

            var orderMessage = new { OrderId = order.Id, Message = "Mutfak dikkat, sipariş güncellendi!" };
            await _messageProducer.SendMessageAsync(orderMessage, "order_queue");
        }
    }
}