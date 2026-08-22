using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.DeleteRegion
{
    public class DeleteRegionCommandHandler(IAppDbContext db, ICurrentUserService currentUser) : IRequestHandler<DeleteRegionCommand, Result>
    {
        public async Task<Result> Handle(DeleteRegionCommand command, CancellationToken cancellationToken)
        {
            Region? region = await db.Regions
                .FirstOrDefaultAsync(r => r.Id == command.Id, cancellationToken);
            if (region is null) return Result.Failure("Böyle bir bölge bulunamadı");

            List<Table> linkedTables = await db.Tables
                .Where(t => t.RegionId == command.Id)
                .ToListAsync(cancellationToken);
            region.EnsureCanBeDeleted(linkedTables);

            db.Regions.Remove(region);

            User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Warning,
                "RegionDeleted",
                $"{actor?.FullName} {region.Name} bölgesini sildi.",
                nameof(Region),
                region.Id);
            db.AuditLogs.Add(log);

            await db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
