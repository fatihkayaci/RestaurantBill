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
        /// Returns the active order for the given table, including its items and product details.
        /// </summary>
        public async Task<IEnumerable<RestaurantDto>> Handle(GetRestaurantByUserIdQuery request, CancellationToken cancellationToken)
        {
            var userId = _httpContextAccessor.HttpContext!.User
                .FindFirst(ClaimTypes.NameIdentifier)!.Value;
            var restaurants = await _uow.Restaurant.GetAllAsync(x => x.UserId == userId, false);
            return _mapper.Map<IEnumerable<RestaurantDto>>(restaurants);
        }
    }
}