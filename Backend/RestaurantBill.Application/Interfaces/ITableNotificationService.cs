namespace RestaurantBill.Application.Interfaces;
public interface ITableNotificationService
{
    Task SendTableStatusChangedAsync(int tableId, int status);
    Task SendOrderUpdatedAsync(int tableId);
    Task SendOrderClosedAsync(int tableId, int orderId);
}