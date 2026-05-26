using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen
{
    public class GetAllOrdersToKitchenQueryHandler : IRequestHandler<GetAllOrdersToKitchenQuery, List<OrderDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;

        public GetAllOrdersToKitchenQueryHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;   
        }

        public async Task<List<OrderDto>> Handle(GetAllOrdersToKitchenQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");

            var excludedStatuses = new[] { OrderStatus.Paid, OrderStatus.Cancelled };

            var entities = await _uow.Order.GetAllAsync(
                o => !excludedStatuses.Contains(o.Status) && o.Table.RestaurantId == restaurantId,
                false,
                "OrderItems,OrderItems.Product"
            );

            return _mapper.Map<List<OrderDto>>(entities);
        }
    }
}