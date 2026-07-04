using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Notification;

namespace RestaurantBill.Application.NotificationHandlers
{
    public class NotifyTableOnOrderUpdatedHandler : INotificationHandler<OrderUpdatedNotification>
    {
        private readonly ITableNotificationService _tableNotificationService;

        public NotifyTableOnOrderUpdatedHandler(ITableNotificationService tableNotificationService)
        {
            _tableNotificationService = tableNotificationService;
        }

        public async Task Handle(OrderUpdatedNotification notification, CancellationToken cancellationToken)
        {
            await _tableNotificationService.SendOrderUpdatedAsync(notification.Order.TableId, notification.Order.TotalPrice);
        }
    }
}