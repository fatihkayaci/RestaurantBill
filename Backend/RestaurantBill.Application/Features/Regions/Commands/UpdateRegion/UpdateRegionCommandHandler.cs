using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Regions.Commands.UpdateRegion
{
    public class UpdateRegionCommandHandler : IRequestHandler<UpdateRegionCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateRegionCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(UpdateRegionCommand command, CancellationToken cancellationToken)
        {
            Region? region = await _uow.Region.GetByIdAsync(command.Id, true);
            Guard.AgainstNull(region, "Böyle bir bölge bulunamadı");

            region.Rename(command.Name);

            await _uow.Region.UpdateAsync(region);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
