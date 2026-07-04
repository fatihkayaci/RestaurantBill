namespace RestaurantBill.Application.Interfaces;

public interface ICashierNotificationService
{
    Task SendOrderServedAsync(int restaurantId);
}
