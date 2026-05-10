using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToCashierQuery
{
    public class GetAllOrdersToCashierQueryHandler : IRequestHandler<GetAllOrdersToCashierQuery, List<OrderDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public GetAllOrdersToCashierQueryHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }

        public async Task<List<OrderDto>> Handle(GetAllOrdersToCashierQuery request, CancellationToken cancellationToken)
        {
            var excludedStatuses = new[] { OrderStatus.Served };

            var entities = await _uow.Order.GetAllAsync(
                o => o.Status == OrderStatus.Served,
                false,
                "OrderItems,OrderItems.Product"
            );

            return _mapper.Map<List<OrderDto>>(entities);
        }
    }
}