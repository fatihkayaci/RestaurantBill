using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch
{
    public class UpdateBranchCommandHandler : IRequestHandler<UpdateBranchCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public UpdateBranchCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateBranchCommand request, CancellationToken cancellationToken)
        {
            Branch? branch = await _db.Branches
                .Include(b => b.Company)
                .FirstOrDefaultAsync(b => b.Id == request.RestaurantId, cancellationToken);
            if (branch is null || branch.Company.OwnerUserId != _currentUser.UserId)
                return Result.Failure("Şube bulunamadı.");

            branch.Update(request.Name, request.ManagerName, request.PhoneNumber, request.Email, request.City, request.District, request.OpenAddress, request.TaxRate);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                branch.Id,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "BranchUpdated",
                $"{actor?.FullName} {branch.BranchName} şubesini güncelledi.",
                nameof(Branch),
                branch.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
