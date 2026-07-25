using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId
{
    public class GetRestaurantByUserIdQueryHandler : IRequestHandler<GetRestaurantByUserIdQuery, Result<RestaurantDto>>
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
        public async Task<Result<RestaurantDto>> Handle(GetRestaurantByUserIdQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            IEnumerable<Restaurant> restaurants = await _uow.Restaurant.GetAllAsync(x => x.Id == restaurantId, false);
            Restaurant? restaurant = restaurants.FirstOrDefault();
            if (restaurant is null)
            {
                return Result<RestaurantDto>.Failure("Restoran bulunamadı.");
            }
            return Result<RestaurantDto>.Success(restaurant.ToDto());
        }
    }
}
