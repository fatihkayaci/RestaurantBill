using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Queries.GetAllOrdersToCashierQuery
{
    public class GetAllOrdersToCashierQueryHandler : IRequestHandler<GetAllOrdersToCashierQuery, Result<List<OrderDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAllOrdersToCashierQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<List<OrderDto>>> Handle(GetAllOrdersToCashierQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) 
                return Result<List<OrderDto>>.Failure("ID değeri 0 veya negatif olamaz.");

            var entities = await _uow.Order.GetAllAsync(
                o => o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled && o.Table.RestaurantId == restaurantId,
                false,
                "OrderItems,OrderItems.Product"
            );

            return Result<List<OrderDto>>.Success(entities.Select(o => o.ToDto()).ToList());
        }
    }
}