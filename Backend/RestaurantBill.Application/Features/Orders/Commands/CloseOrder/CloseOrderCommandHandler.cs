using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.CloseOrder
{
    public class CloseOrderCommandHandler : IRequestHandler<DeleteCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;

        public CloseOrderCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
        }
        /// <summary>
        /// Closes the order, marks it as Paid and sets the table status to Available.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if order ID is zero or less, or if the order is not found.</exception>
        public async Task Handle(DeleteCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            Table? table = await _uow.Table.GetByIdAsync(order.TableId, true);
            Guard.AgainstNull(table, "Böyle bir Masa bulunamadı.");

            order.Close();
            table.Release();

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(table.Id, (int)table.Status);
            await _tableNotificationService.SendOrderClosedAsync(table.Id, order.Id);
        }
    }
}