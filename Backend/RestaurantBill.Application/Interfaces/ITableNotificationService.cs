namespace RestaurantBill.Application.Interfaces;
public interface ITableNotificationService
{
    Task SendTableStatusChangedAsync(int restaurantId, int tableId, int status);
    Task SendOrderUpdatedAsync(int restaurantId, int tableId, decimal totalPrice);
    Task SendOrderClosedAsync(int restaurantId, int tableId, int orderId);
}