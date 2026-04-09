using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Tables.Commands.Delete
{
    public class DeleteHandler : IRequestHandler<DeleteCommand>
    {
        private readonly IUnitOfWork _uow;


        public DeleteHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        /// <summary>
        /// Creates a new table with the given name.
        /// </summary>
        public async Task Handle(DeleteCommand request, CancellationToken cancellationToken)
        {
            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Masa bulunamadı.");
            _uow.Table.Delete(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}