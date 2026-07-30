using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches
{
    public class GetMyBranchesQuery : IRequest<Result<List<BranchDto>>>
    {
    }
}
