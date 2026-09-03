using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;
namespace RestaurantBill.Application.Features.Regions.Queries.GetAllRegions
{
    public class GetAllRegionQueryHandler : IRequestHandler<GetAllRegionQuery, Result<List<RegionDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetAllRegionQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<RegionDto>>> Handle(GetAllRegionQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty) return Result<List<RegionDto>>.Failure("Geçersiz şube bilgisi.");

            var regions = await _db.Regions
                .AsNoTracking()
                .Where(r => r.BranchId == restaurantId)
                .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
                .Select(r => new RegionDto { Id = r.Id, Name = r.Name })
                .ToListAsync(cancellationToken);

            return Result<List<RegionDto>>.Success(regions);
        }
    }
}
