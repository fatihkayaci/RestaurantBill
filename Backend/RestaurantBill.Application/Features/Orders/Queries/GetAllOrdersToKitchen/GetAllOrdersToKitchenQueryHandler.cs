using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToKitchen
{
    public class GetAllOrdersToKitchenQueryHandler : IRequestHandler<GetAllOrdersToKitchenQuery, Result<List<OrderDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAllOrdersToKitchenQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<List<OrderDto>>> Handle(GetAllOrdersToKitchenQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if(restaurantId == Guid.Empty) 
                return Result<List<OrderDto>>.Failure("ID değeri 0 veya negatif olamaz.");

            var excludedStatuses = new[] { OrderStatus.Paid, OrderStatus.Cancelled };

            var entities = await _uow.Order.GetAllAsync(
                o => !excludedStatuses.Contains(o.Status) && o.Table.Region.BranchId == restaurantId,
                false,
                "OrderItems,OrderItems.Product"
            );

            return Result<List<OrderDto>>.Success(entities.Select(o => o.ToDto()).ToList());
        }
    }
}