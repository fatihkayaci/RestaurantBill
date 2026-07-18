using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Tables.Commands.UpdateTable
{
    public class UpdateCommandHandler : IRequestHandler<UpdateTableCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(UpdateTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.Id, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı");

            table.Update(request.Name, table.Note);
            table.AssignRegion(request.RegionId);
            if (request.Status.HasValue)
                table.SetStatus(request.Status.Value);

            await _uow.Table.UpdateAsync(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
