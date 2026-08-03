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
            Guid restaurantId = _currentUser.BranchId;
            if(restaurantId == Guid.Empty) 
                return Result<List<OrderDto>>.Failure("ID değeri 0 veya negatif olamaz.");

            var entities = await _uow.Order.GetAllAsync(
                o => o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled && o.Table.Region.BranchId == restaurantId,
                false,
                "OrderItems,OrderItems.Product,Table"
            );

            var creatorIds = entities.Select(o => o.CreatedUser).Distinct().ToList();
            var creators = await _uow.User.GetAllAsync(u => creatorIds.Contains(u.Id));
            var creatorNameById = creators.ToDictionary(u => u.Id, u => u.FullName);

            return Result<List<OrderDto>>.Success(entities.Select(o =>
            {
                var dto = o.ToDto();
                dto.CreatedByUserName = creatorNameById.GetValueOrDefault(o.CreatedUser, string.Empty);
                return dto;
            }).ToList());
        }
    }
}