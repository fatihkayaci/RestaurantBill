using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Regions.Commands.DeleteRegion
{
    public class DeleteRegionCommandHandler(IUnitOfWork uow) : IRequestHandler<DeleteRegionCommand>
    {
        public async Task Handle(DeleteRegionCommand command, CancellationToken cancellationToken)
        {
            Region? region = await uow.Region.GetByIdAsync(command.Id);
            Guard.AgainstNull(region, "Böyle bir bölge bulunamadı");

            IEnumerable<Table> linkedTables = await uow.Table.GetAllAsync(t => t.RegionId == command.Id, false);
            region.EnsureCanBeDeleted(linkedTables);

            uow.Region.Delete(region);
            await uow.SaveChangesAsync(cancellationToken);
        }
    }
}
