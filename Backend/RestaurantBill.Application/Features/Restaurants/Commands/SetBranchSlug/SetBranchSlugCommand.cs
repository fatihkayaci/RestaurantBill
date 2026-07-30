using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.SetBranchSlug
{
    public class SetBranchSlugCommand : IRequest<Result<string>>
    {
        public int RestaurantId { get; set; }
        public string Slug { get; set; } = string.Empty;
    }
}
