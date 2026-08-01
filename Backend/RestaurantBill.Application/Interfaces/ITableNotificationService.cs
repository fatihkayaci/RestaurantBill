namespace RestaurantBill.Application.Interfaces;
public interface ITableNotificationService
{
    Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status);
    Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice);
    Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId);
}