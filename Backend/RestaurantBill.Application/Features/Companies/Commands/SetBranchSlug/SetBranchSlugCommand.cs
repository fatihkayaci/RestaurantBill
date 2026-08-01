using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Commands.SetBranchSlug
{
    public class SetBranchSlugCommand : IRequest<Result<string>>
    {
        public Guid RestaurantId { get; set; }
        public string Slug { get; set; } = string.Empty;
    }
}
