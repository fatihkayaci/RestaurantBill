using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Regions.Queries.GetAllRegions
{
    public class GetAllRegionQuery : IRequest<List<RegionDto>>, ICacheable
    {
        public string CacheKey => "regions:all";
        public TimeSpan Ttl => TimeSpan.FromSeconds(60);
    }
}
