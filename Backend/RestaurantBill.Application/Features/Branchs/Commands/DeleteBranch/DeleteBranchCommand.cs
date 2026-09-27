using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.DeleteBranch
{
    public class DeleteBranchCommand : IRequest<Result>
    {
        public Guid BranchId { get; set; }
    }
}
