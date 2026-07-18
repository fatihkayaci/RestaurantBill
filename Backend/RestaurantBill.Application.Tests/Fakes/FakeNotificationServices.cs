using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeTableNotificationService : ITableNotificationService
{
    public Task SendTableStatusChangedAsync(int restaurantId, int tableId, int status) => Task.CompletedTask;
    public Task SendOrderUpdatedAsync(int restaurantId, int tableId, decimal totalPrice) => Task.CompletedTask;
    public Task SendOrderClosedAsync(int restaurantId, int tableId, int orderId) => Task.CompletedTask;
}

public class FakeCashierNotificationService : ICashierNotificationService
{
    public Task SendOrdersChangedAsync(int restaurantId) => Task.CompletedTask;
}
