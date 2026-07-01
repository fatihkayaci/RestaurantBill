using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAllTable
{
    public class GetAllTableQueryHandler : IRequestHandler<GetAllTableQuery, List<TableDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAllTableQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Returns all tables belonging to the authenticated user's restaurant.
        /// </summary>
        public async Task<List<TableDto>> Handle(GetAllTableQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
            var entities = await _uow.Table.GetAllAsync(t => t.RestaurantId == restaurantId);

            return entities.OrderBy(t => t.Name).Select(t => t.ToDto()).ToList();
        }
    }
}