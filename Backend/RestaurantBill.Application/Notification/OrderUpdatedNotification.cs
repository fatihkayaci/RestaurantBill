using MediatR;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Notification
{
    public class OrderUpdatedNotification : INotification
    {
        public Order Order { get; }

        public OrderUpdatedNotification(Order order)
        {
            Order = order;
        }
    }
}