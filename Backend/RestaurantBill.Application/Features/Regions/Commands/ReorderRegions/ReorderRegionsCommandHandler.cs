using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.ReorderRegions
{
    public class ReorderRegionsCommandHandler : IRequestHandler<ReorderRegionsCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public ReorderRegionsCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(ReorderRegionsCommand command, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;

            List<Region> regions = await _db.Regions
                .Where(r => r.BranchId == restaurantId && command.OrderedRegionIds.Contains(r.Id))
                .ToListAsync(cancellationToken);

            if (regions.Count != command.OrderedRegionIds.Count)
                return Result.Failure("Sıralanacak bölgelerden bazıları bulunamadı.");

            for (int i = 0; i < command.OrderedRegionIds.Count; i++)
            {
                Region region = regions.First(r => r.Id == command.OrderedRegionIds[i]);
                region.SetSortOrder(i);
            }

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
