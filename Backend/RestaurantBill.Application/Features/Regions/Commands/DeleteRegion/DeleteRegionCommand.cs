using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Regions.Commands.DeleteRegion
{
    public class DeleteRegionCommand : IRequest, IInvalidatesCache
    {
        public int Id { get; set; }

        public string[] CacheKeysToInvalidate => ["regions:all"];
    }
}
