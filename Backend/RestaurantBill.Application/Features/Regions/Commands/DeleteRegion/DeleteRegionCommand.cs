using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.DeleteRegion
{
    public class DeleteRegionCommand : IRequest<Result>, IInvalidatesCache
    {
        public int Id { get; set; }

        public string[] CacheKeysToInvalidate => ["regions:all"];
    }
}
