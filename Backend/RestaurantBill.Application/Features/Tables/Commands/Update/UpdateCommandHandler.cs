using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Tables.Commands.Update
{
    public class UpdateCommandHandler : IRequestHandler<UpdateCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        /// <summary>
        /// Creates a new table with the given name.
        /// </summary>
        public async Task Handle(UpdateCommand request, CancellationToken cancellationToken)
        {
            var table = await _uow.Table.GetByIdAsync(request.Id, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı");
            table.Name = request.Name;
            if (request.Status.HasValue)
                table.Status = request.Status.Value;
            await _uow.Table.UpdateAsync(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}