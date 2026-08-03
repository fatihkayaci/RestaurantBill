namespace RestaurantBill.Application.Interfaces;

public interface ICashierNotificationService
{
    Task SendOrdersChangedAsync(Guid restaurantId);
}
