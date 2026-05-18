using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrder
{
    public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;

        public CancelOrderCommandHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
        }
        /// <summary>
        /// Cancels the order and sets the table status to Available.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if order ID is zero or less, or if the order/table is not found.</exception>
        public async Task Handle(CancelOrderCommand request, CancellationToken cancellationToken)
        {
            Order? order = await _uow.Order.GetByIdAsync(request.OrderId, true);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            Table? table = await _uow.Table.GetByIdAsync(order.TableId, true);
            Guard.AgainstNull(table, "Bu siparişe ait bir masa bulunamadı.");

            order.Cancel();
            table.Release();

            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(table.Id, (int)table.Status);
            await _tableNotificationService.SendOrderClosedAsync(table.Id, order.Id);
        }
    }
}