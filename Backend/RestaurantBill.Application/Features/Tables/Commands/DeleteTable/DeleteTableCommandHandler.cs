using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

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
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Masa bulunamadı.");

            IEnumerable<Order> activeOrders = await _uow.Order.GetAllAsync(
                o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled, false);
            table.EnsureCanBeDeleted(activeOrders);

            _uow.Table.Delete(table);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}