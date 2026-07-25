using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAllTable
{
    public class GetAllTableQueryHandler : IRequestHandler<GetAllTableQuery, Result<List<TableDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAllTableQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Returns all tables belonging to the authenticated user's restaurant, including the total price of each table's active order (if any).
        /// </summary>
        public async Task<Result<List<TableDto>>> Handle(GetAllTableQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) return Result<List<TableDto>>.Failure("ID değeri 0 veya negatif olamaz.");
            var entities = await _uow.Table.GetAllAsync(t => t.RestaurantId == restaurantId, includeProperties: "Region");

            var tableIds = entities.Select(t => t.Id).ToList();
            var activeOrders = await _uow.Order.GetAllAsync(o =>
                tableIds.Contains(o.TableId) && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled);
            var totalsByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.TotalPrice);
            var occupiedSinceByTableId = activeOrders.ToDictionary(o => o.TableId, o => o.CreatedAt);

            return Result<List<TableDto>>.Success(entities
                .OrderBy(t => t.Name)
                .Select(t =>
                {
                    var dto = t.ToDto();
                    dto.ActiveOrderTotal = totalsByTableId.GetValueOrDefault(t.Id);
                    dto.OccupiedSince = occupiedSinceByTableId.TryGetValue(t.Id, out var createdAt) ? createdAt : null;
                    return dto;
                })
                .ToList());
        }
    }
}