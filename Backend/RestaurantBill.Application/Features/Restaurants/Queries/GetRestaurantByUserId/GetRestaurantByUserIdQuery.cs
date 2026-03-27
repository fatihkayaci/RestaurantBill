using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId
{
    public class GetRestaurantByUserIdQuery : IRequest<IEnumerable<RestaurantDto>> 
    {
    }
}