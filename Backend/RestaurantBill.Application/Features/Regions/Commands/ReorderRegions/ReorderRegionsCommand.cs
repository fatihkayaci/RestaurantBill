using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.ReorderRegions
{
    public class ReorderRegionsCommand : IRequest<Result>, IInvalidatesCache
    {
        public required List<Guid> OrderedRegionIds { get; set; }

        public string[] CacheKeysToInvalidate => ["regions:all"];
    }
}
