using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetBranchByUserId
{
    public class GetBranchByUserIdQuery : IRequest<Result<RestaurantDto>>
    {
    }
}