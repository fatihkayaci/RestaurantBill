using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetRestaurantByUserId
{
    public class GetRestaurantByUserIdQuery : IRequest<Result<RestaurantDto>>
    {
    }
}