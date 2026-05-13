using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId
{
    public class GetRestaurantByUserIdQueryHandler : IRequestHandler<GetRestaurantByUserIdQuery, RestaurantDto>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;

        public GetRestaurantByUserIdQueryHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
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
            return _mapper.Map<RestaurantDto>(restaurant);
        }
    }
}
