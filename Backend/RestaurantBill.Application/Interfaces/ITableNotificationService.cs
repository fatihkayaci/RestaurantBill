namespace RestaurantBill.Application.Interfaces;
public interface ITableNotificationService
{
    Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status);
    Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice, string createdByUserName);
    Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId);
    // Müşteri sipariş/rezervasyon talebi geldi ya da işlendi; personel ekranları listeyi yeniler.
    Task SendCustomerRequestsChangedAsync(Guid restaurantId);
}