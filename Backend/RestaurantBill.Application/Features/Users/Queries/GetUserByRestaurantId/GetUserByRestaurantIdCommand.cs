using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId
{
    public class GetUserByRestaurantIdCommand : IRequest<IEnumerable<UserDto>>, ICacheable
    {
        public string CacheKey => "stuff:all";

        public TimeSpan Ttl => TimeSpan.FromSeconds(60);
    }
}