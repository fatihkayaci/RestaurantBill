using AutoMapper;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, int>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IMessageProducer _messageProducer;

        public CreateOrderCommandHandler(IUnitOfWork uow, IMapper mapper, IMessageProducer messageProducer)
        {
            _uow = uow;
            _mapper = mapper;
            _messageProducer = messageProducer;
        }

        public async Task<int> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
        {
            var order = new Order
            {
                TableId = request.TableId,
                Status = OrderStatus.Pending,
                OrderItems = new List<OrderItem>()
            };

            foreach (var item in request.OrderItems)
            {
                var product = await _uow.Product.GetByIdAsync(item.ProductId);
                Guard.AgainstNull(product, "Ürün bulunamadı!"); 

                var orderItem = new OrderItem
                {
                    ProductId = product.Id,
                    Quantity = item.Quantity,
                    UnitPrice = product.Price
                };

                order.OrderItems.Add(orderItem);
            }

            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);
            
            var orderMessage = new 
            { 
                OrderId = order.Id,
                Note = request.Note,
                Message = "Mutfak dikkat, yeni sipariş geldi usta!" 
            };
            await _messageProducer.SendMessageAsync(orderMessage, "order_queue");

            return order.Id;
        }
    }
}