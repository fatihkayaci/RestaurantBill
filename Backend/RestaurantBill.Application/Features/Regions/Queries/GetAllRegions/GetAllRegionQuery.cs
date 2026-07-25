using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Queries.GetAllRegions
{
    public class GetAllRegionQuery : IRequest<Result<List<RegionDto>>>, ICacheable
    {
        public string CacheKey => "regions:all";
        public TimeSpan Ttl => TimeSpan.FromSeconds(60);
    }
}
