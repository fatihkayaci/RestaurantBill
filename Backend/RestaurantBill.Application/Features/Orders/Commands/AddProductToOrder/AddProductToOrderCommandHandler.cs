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

        public async Task Handle(AddProductToOrderCommand request, CancellationToken cancellationToken)
        {
            if (request.Quantity <= 0) 
                throw new BusinessException("Miktar 0'dan büyük olmalı!");

            var order = await _uow.Order.GetByIdAsync(request.OrderId, true, o => o.OrderItems);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            var product = await _uow.Product.GetByIdAsync(request.ProductId);
            Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");

            var existingItem = order.OrderItems.FirstOrDefault(x => x.ProductId == request.ProductId);

            if (existingItem != null)
            {
                existingItem.Quantity += request.Quantity; 
            }
            else
            {
                var newItem = new OrderItem
                {
                    ProductId = request.ProductId,
                    Quantity = request.Quantity,
                    UnitPrice = product.Price
                }; 
                
                order.OrderItems.Add(newItem);
            }
            order.TotalPrice = order.OrderItems.Sum(item => item.UnitPrice * item.Quantity);

            var orderMessage = new 
            { 
                OrderId = order.Id,
                Message = "Mutfak dikkat, yeni sipariş geldi usta!" 
            };
            await _messageProducer.SendMessageAsync(orderMessage, "order_queue");
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}