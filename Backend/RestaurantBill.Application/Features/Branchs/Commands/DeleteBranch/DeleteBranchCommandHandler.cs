using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.DeleteBranch
{
    public class DeleteBranchCommandHandler : IRequestHandler<DeleteBranchCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public DeleteBranchCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(DeleteBranchCommand request, CancellationToken cancellationToken)
        {
            Branch? branch = await _db.Branches
                .Include(b => b.Company)
                .FirstOrDefaultAsync(b => b.Id == request.BranchId, cancellationToken);
            if (branch is null || branch.Company.OwnerUserId != _currentUser.UserId)
                return Result.Failure("Şube bulunamadı.");

            List<Region> linkedRegions = await _db.Regions
                .Where(r => r.BranchId == branch.Id)
                .ToListAsync(cancellationToken);
            List<UserBranch> linkedStaff = await _db.UserBranches
                .Where(ub => ub.BranchId == branch.Id)
                .ToListAsync(cancellationToken);
            branch.EnsureCanBeDeleted(linkedRegions, linkedStaff);

            _db.Branches.Remove(branch);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                branch.Id,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Warning,
                "BranchDeleted",
                $"{actor?.FullName} {branch.BranchName} şubesini sildi.",
                nameof(Branch),
                branch.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
