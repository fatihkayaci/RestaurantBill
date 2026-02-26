using AutoMapper;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
// using RestaurantBill.Application.Repositories; // Kendi yolunu eklersin

namespace RestaurantBill.Application.Features.Orders.Commands.CreateOrder
{
    public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, int>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public CreateOrderCommandHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }

        public async Task<int> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
        {
            var order = _mapper.Map<Order>(request);
            order.Status = OrderStatus.Pending;
            order.TotalPrice = 0;
            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);
            return order.Id;
        }
    }
}