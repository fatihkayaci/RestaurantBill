using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;
namespace RestaurantBill.Application.Features.Regions.Queries.GetAllRegions
{
    public class GetAllRegionQueryHandler : IRequestHandler<GetAllRegionQuery, Result<List<RegionDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAllRegionQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }
        /// <summary>
        /// Returns all regions belonging to the current restaurant.
        /// </summary>
        public async Task<Result<List<RegionDto>>> Handle(GetAllRegionQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if(restaurantId == Guid.Empty) return Result<List<RegionDto>>.Failure("ID değeri 0 veya negatif olamaz.");
            var entities = await _uow.Region.GetAllAsync(r => r.BranchId == restaurantId, false, null);

            return Result<List<RegionDto>>.Success(entities.OrderBy(r => r.Name).Select(r => r.ToDto()).ToList());
        }
    }
}
