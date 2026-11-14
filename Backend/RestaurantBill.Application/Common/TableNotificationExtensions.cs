using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Common;

// Masa ekranı bildirimleri yalnızca masası olan siparişler içindir; paket siparişte hiçbir şey gönderilmez.
public static class TableNotificationExtensions
{
    public static Task SendOrderUpdatedAsync(this ITableNotificationService notifications, Guid branchId, Order order, string createdByUserName)
        => order.TableId is Guid tableId
            ? notifications.SendOrderUpdatedAsync(branchId, tableId, order.TotalPrice, createdByUserName)
            : Task.CompletedTask;
}
