using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using System.Security.Claims;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId
{
    public class GetRestaurantByUserIdHandler : IRequestHandler<GetRestaurantByUserIdQuery, IEnumerable<RestaurantDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;

        public GetRestaurantByUserIdHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
        }
        /// <summary>
        /// Retrieves all restaurants associated with the currently authenticated user asynchronously. 
        /// The user ID is dynamically extracted from the HTTP context claims, and the results are mapped to DTOs.
        /// </summary>
        /// <param name="request">The query request to retrieve the user's restaurants.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>An enumerable collection of <see cref="RestaurantDto"/> representing the user's restaurants.</returns>
        public async Task<IEnumerable<RestaurantDto>> Handle(GetRestaurantByUserIdQuery request, CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (string.IsNullOrEmpty(userId)) throw new BusinessException("Kullanıcı kimliği geçersiz.");
            var restaurants = await _uow.Restaurant.GetAllAsync(x => x.UserId == userId, false);
            return _mapper.Map<IEnumerable<RestaurantDto>>(restaurants);
        }
    }
}