using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableHandler : IRequestHandler<OpenTableCommand, int>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;

        public OpenTableHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
        }

        /// <summary>
        /// Opens the table, sets status to Occupied and creates a new empty order.
        /// Returns the newly created order ID.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if table ID is invalid, table is not found, or table is already occupied.</exception>
        public async Task<int> Handle(OpenTableCommand request, CancellationToken cancellationToken)
        {
            if (request.TableId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            var table = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");
            
            if (table.Status == TableStatus.Occupied)
                throw new BusinessException("Bu masa zaten dolu!");

            table.Status = TableStatus.Occupied;
            
            var order = new Order
            {
                TableId = request.TableId,
            };
            
            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(table.Id, (int)table.Status);

            return order.Id;
        }
    }
}