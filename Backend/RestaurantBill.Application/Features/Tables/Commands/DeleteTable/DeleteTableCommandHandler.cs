using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Tables.Commands.DeleteTable
{
    public class DeleteHandler : IRequestHandler<DeleteTableCommand>
    {
        private readonly IUnitOfWork _uow;


        public DeleteHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        /// <summary>
        /// Creates a new table with the given name.
        /// </summary>
        public async Task Handle(DeleteTableCommand request, CancellationToken cancellationToken)
        {
            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Masa bulunamadı.");
            _uow.Table.Delete(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}