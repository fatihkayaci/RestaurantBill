using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.UpdateRegion
{
    public class UpdateRegionCommandHandler : IRequestHandler<UpdateRegionCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public UpdateRegionCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateRegionCommand command, CancellationToken cancellationToken)
        {
            Region? region = await _db.Regions
                .FirstOrDefaultAsync(r => r.Id == command.Id, cancellationToken);
            if (region is null) return Result.Failure("Böyle bir bölge bulunamadı");

            region.Rename(command.Name);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "RegionUpdated",
                $"{actor?.FullName} {region.Name} bölgesini güncelledi.",
                nameof(Region),
                region.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
