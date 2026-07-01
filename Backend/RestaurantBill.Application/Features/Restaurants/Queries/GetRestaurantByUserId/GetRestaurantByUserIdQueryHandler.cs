using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId
{
    public class GetRestaurantByUserIdQueryHandler : IRequestHandler<GetRestaurantByUserIdQuery, RestaurantDto>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetRestaurantByUserIdQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }
        /// <summary>
        /// Retrieves the restaurant associated with the currently authenticated user asynchronously.
        /// Uses RestaurantId from claims, which is set for all roles (Admin, Cashier, Waiter, Kitchen).
        /// </summary>
        public async Task<RestaurantDto> Handle(GetRestaurantByUserIdQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            IEnumerable<Restaurant> restaurants = await _uow.Restaurant.GetAllAsync(x => x.Id == restaurantId, false);
            Restaurant restaurant = restaurants.FirstOrDefault()
                ?? throw new NotFoundException("Restoran bulunamadı.");
            return restaurant.ToDto();
        }
    }
}
