using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.UpdateTable
{
    public class UpdateCommandHandler : IRequestHandler<UpdateTableCommand, Result>
    {
        private readonly IUnitOfWork _uow;

        public UpdateCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<Result> Handle(UpdateTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.Id, true);
            if (table is null) return Result.Failure("Böyle bir masa bulunamadı");

            table.Update(request.Name, table.Note);
            table.AssignRegion(request.RegionId);
            if (request.Status.HasValue)
                table.SetStatus(request.Status.Value);

            await _uow.Table.UpdateAsync(table);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
