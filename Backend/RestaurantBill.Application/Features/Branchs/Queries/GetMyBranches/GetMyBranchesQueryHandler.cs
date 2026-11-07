using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetMyBranches
{
    public class GetMyBranchesQueryHandler : IRequestHandler<GetMyBranchesQuery, Result<List<BranchDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetMyBranchesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<BranchDto>>> Handle(GetMyBranchesQuery request, CancellationToken cancellationToken)
        {
            // Owner sahibi olduğu tüm şubeleri, Admin ise atandığı şubeleri görür (şube seçici listesi).
            IQueryable<Branch> query = _currentUser.Role == "Owner"
                ? _db.Branches.Where(b => b.Company.OwnerUserId == _currentUser.UserId)
                : _db.Branches.Where(b => _db.UserBranches.Any(ub => ub.UserId == _currentUser.UserId && ub.BranchId == b.Id && !ub.IsDeleted && ub.IsActive));

            List<Branch> branches = await query
                .AsNoTracking()
                .Where(b => !b.IsDeleted)
                .OrderBy(b => b.CreatedAt)
                .ToListAsync(cancellationToken);
            List<Guid> branchIds = branches.Select(b => b.Id).ToList();

            List<Guid> tableBranchIds = await _db.Tables
                .AsNoTracking()
                .Where(t => branchIds.Contains(t.Region.BranchId))
                .Select(t => t.Region.BranchId)
                .ToListAsync(cancellationToken);
            List<UserBranch> staff = await _db.UserBranches
                .AsNoTracking()
                .Where(ur => branchIds.Contains(ur.BranchId) && !ur.IsDeleted)
                .ToListAsync(cancellationToken);
            // Ödenen kalemler siparişten düştüğü için ciro ödeme kayıtlarından hesaplanır.
            var paymentRows = await _db.Payments
                .AsNoTracking()
                .Where(p => branchIds.Contains(p.CashRegister.BranchId))
                .Select(p => new { p.CashRegister.BranchId, p.TotalAmount })
                .ToListAsync(cancellationToken);

            Dictionary<Guid, int> tableCounts = tableBranchIds.GroupBy(id => id).ToDictionary(g => g.Key, g => g.Count());
            Dictionary<Guid, int> staffCounts = staff.GroupBy(s => s.BranchId).ToDictionary(g => g.Key, g => g.Count());
            Dictionary<Guid, decimal> revenueByRestaurant = paymentRows.GroupBy(p => p.BranchId).ToDictionary(g => g.Key, g => g.Sum(p => p.TotalAmount));

            List<BranchDto> result = branches.Select(b => b.ToBranchDto(
                tableCounts.GetValueOrDefault(b.Id),
                staffCounts.GetValueOrDefault(b.Id),
                revenueByRestaurant.GetValueOrDefault(b.Id)
            )).ToList();

            return Result<List<BranchDto>>.Success(result);
        }
    }
}
