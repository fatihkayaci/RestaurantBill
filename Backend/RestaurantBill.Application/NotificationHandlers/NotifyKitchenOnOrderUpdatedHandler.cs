using MediatR;
using RestaurantBill.Application.Interfaces; 
using RestaurantBill.Application.Notification;

namespace RestaurantBill.Application.NotificationHandlers
{
    public class NotifyKitchenOnOrderUpdatedHandler : INotificationHandler<OrderUpdatedNotification>
    {
        private readonly IOrderMessagePublisher _publisher;

        public NotifyKitchenOnOrderUpdatedHandler(IOrderMessagePublisher publisher)
        {
            _publisher = publisher;
        }

        public async Task Handle(OrderUpdatedNotification notification, CancellationToken cancellationToken)
        {
            await _publisher.PublishOrderCreatedAsync(notification.Order, cancellationToken);
        }
    }
}