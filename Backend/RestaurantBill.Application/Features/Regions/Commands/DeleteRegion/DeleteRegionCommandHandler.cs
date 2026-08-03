using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.DeleteRegion
{
    public class DeleteRegionCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser) : IRequestHandler<DeleteRegionCommand, Result>
    {
        public async Task<Result> Handle(DeleteRegionCommand command, CancellationToken cancellationToken)
        {
            Region? region = await uow.Region.GetByIdAsync(command.Id);
            if (region is null) return Result.Failure("Böyle bir bölge bulunamadı");

            IEnumerable<Table> linkedTables = await uow.Table.GetAllAsync(t => t.RegionId == command.Id, false);
            region.EnsureCanBeDeleted(linkedTables);

            uow.Region.Delete(region);

            User? actor = await uow.User.GetByIdAsync(currentUser.UserId);
            AuditLog log = AuditLog.Create(
                currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Warning,
                "RegionDeleted",
                $"{actor?.FullName} {region.Name} bölgesini sildi.",
                nameof(Region),
                region.Id);
            await uow.AuditLog.AddAsync(log);

            await uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
