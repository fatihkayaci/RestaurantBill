using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetBranchByUserId
{
    public class GetRestaurantByUserIdQueryHandler : IRequestHandler<GetBranchByUserIdQuery, Result<BranchDto>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetRestaurantByUserIdQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<BranchDto>> Handle(GetBranchByUserIdQuery request, CancellationToken cancellationToken)
        {
            Guid branchId = _currentUser.BranchId;
            Branch? branch = await _db.Branches
                .AsNoTracking()
                .Include(b => b.Company)
                .FirstOrDefaultAsync(x => x.Id == branchId, cancellationToken);
            if (branch is null)
                return Result<BranchDto>.Failure("Restoran bulunamadı.");

            int tableCount = await _db.Tables
                .AsNoTracking()
                .CountAsync(t => t.Region.BranchId == branchId, cancellationToken);
            int staffCount = await _db.UserBranches
                .AsNoTracking()
                .CountAsync(ub => ub.BranchId == branchId, cancellationToken);
            decimal revenue = await _db.Orders
                .AsNoTracking()
                .Where(o => o.Table.Region.BranchId == branchId)
                .SumAsync(o => (decimal?)o.TotalPrice, cancellationToken) ?? 0;

            return Result<BranchDto>.Success(branch.ToBranchDto(tableCount, staffCount, revenue));
        }
    }
}
