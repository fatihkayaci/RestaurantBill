using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen
{
    public class GetAllOrdersToKitchenQueryHandler : IRequestHandler<GetAllOrdersToKitchenQuery, List<OrderDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public GetAllOrdersToKitchenQueryHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }

        public async Task<List<OrderDto>> Handle(GetAllOrdersToKitchenQuery request, CancellationToken cancellationToken)
        {
            var excludedStatuses = new[] { OrderStatus.Paid, OrderStatus.Cancelled };

            var entities = await _uow.Order.GetAllAsync(
                o => !excludedStatuses.Contains(o.Status),
                false,
                "OrderItems,OrderItems.Product"
            );

            return _mapper.Map<List<OrderDto>>(entities);
        }
    }
}