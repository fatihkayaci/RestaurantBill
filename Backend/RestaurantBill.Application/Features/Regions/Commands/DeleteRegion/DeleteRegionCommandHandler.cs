using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.DeleteRegion
{
    public class DeleteRegionCommandHandler(IUnitOfWork uow) : IRequestHandler<DeleteRegionCommand, Result>
    {
        public async Task<Result> Handle(DeleteRegionCommand command, CancellationToken cancellationToken)
        {
            Region? region = await uow.Region.GetByIdAsync(command.Id);
            if (region is null) return Result.Failure("Böyle bir bölge bulunamadı");

            IEnumerable<Table> linkedTables = await uow.Table.GetAllAsync(t => t.RegionId == command.Id, false);
            region.EnsureCanBeDeleted(linkedTables);

            uow.Region.Delete(region);
            await uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
