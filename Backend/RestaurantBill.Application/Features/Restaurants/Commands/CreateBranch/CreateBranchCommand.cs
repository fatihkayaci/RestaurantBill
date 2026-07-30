using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch
{
    public class CreateBranchCommand : IRequest<Result<RestaurantDto>>
    {
        public required string Name { get; set; }
    }
}
