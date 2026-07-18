using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Regions.Commands.UpdateRegion
{
    public class UpdateRegionCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }
        public required string Name { get; set; }

        public string[] CacheKeysToInvalidate => ["regions:all"];
    }
}
