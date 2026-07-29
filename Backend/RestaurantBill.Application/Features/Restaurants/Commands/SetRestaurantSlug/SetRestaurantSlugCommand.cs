using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.SetRestaurantSlug
{
    public class SetRestaurantSlugCommand : IRequest<Result<string>>
    {
        public string Slug { get; set; } = string.Empty;
    }
}
