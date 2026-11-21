using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
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

            // Liste şubenin tüm bölgelerini içermeli: eksik ya da başka şubeden bölge, eski bir ekrandan gelmiş demektir.
            List<Region> regions = await _db.Regions
                .Where(r => r.BranchId == restaurantId)
                .ToListAsync(cancellationToken);

            if (!Reordering.TryApply(regions, command.OrderedRegionIds, (r, i) => r.SetSortOrder(i)))
                return Result.Failure("Bölge listesi değişmiş. Sayfayı yenileyip tekrar deneyin.");

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
