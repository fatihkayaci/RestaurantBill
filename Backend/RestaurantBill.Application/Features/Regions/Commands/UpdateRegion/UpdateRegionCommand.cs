using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.UpdateRegion
{
    public class UpdateRegionCommand : IRequest<Result>, IInvalidatesCache
    {
        public int Id { get; set; }
        public required string Name { get; set; }

        public string[] CacheKeysToInvalidate => ["regions:all"];
    }
}
