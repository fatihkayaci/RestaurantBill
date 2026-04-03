using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId
{
    public class GetRestaurantByUserIdHandler : IRequestHandler<GetRestaurantByUserIdQuery, IEnumerable<RestaurantDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GetRestaurantByUserIdHandler(IUnitOfWork uow, IMapper mapper, IHttpContextAccessor httpContextAccessor)
        {
            _uow = uow;
            _mapper = mapper;
            _httpContextAccessor = httpContextAccessor;
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
            var userId = _httpContextAccessor.HttpContext!.User
                .FindFirst(ClaimTypes.NameIdentifier)!.Value;
            var restaurants = await _uow.Restaurant.GetAllAsync(x => x.UserId == userId, false);
            return _mapper.Map<IEnumerable<RestaurantDto>>(restaurants);
        }
    }
}