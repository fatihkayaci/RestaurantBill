using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch
{
    public class UpdateBranchCommand : IRequest<Result>
    {
        public int RestaurantId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
    }
}
