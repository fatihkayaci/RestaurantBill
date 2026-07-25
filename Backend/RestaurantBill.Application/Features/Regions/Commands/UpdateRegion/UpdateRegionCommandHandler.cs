using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Regions.Commands.UpdateRegion
{
    public class UpdateRegionCommandHandler : IRequestHandler<UpdateRegionCommand, Result>
    {
        private readonly IUnitOfWork _uow;

        public UpdateRegionCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<Result> Handle(UpdateRegionCommand command, CancellationToken cancellationToken)
        {
            Region? region = await _uow.Region.GetByIdAsync(command.Id, true);
            if (region is null) return Result.Failure("Böyle bir bölge bulunamadı");

            region.Rename(command.Name);

            await _uow.Region.UpdateAsync(region);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
