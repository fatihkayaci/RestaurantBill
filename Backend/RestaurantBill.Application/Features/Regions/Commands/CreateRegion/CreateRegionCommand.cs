using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.CreateRegion
{
    public class CreateRegionCommand : IRequest<Result>, IInvalidatesCache, IIdempotent
    {
        public required string Name { get; set; }

        public string IdempotencyKey => $"create-region:{Name}";
        public string[] CacheKeysToInvalidate => ["regions:all"];
    }
}
