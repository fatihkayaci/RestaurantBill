using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Regions.Commands.CreateRegion
{
    public class CreateRegionCommand : IRequest, IInvalidatesCache, IIdempotent
    {
        public required string Name { get; set; }

        public string IdempotencyKey => $"create-region:{Name}";
        public string[] CacheKeysToInvalidate => ["regions:all"];
    }
}
