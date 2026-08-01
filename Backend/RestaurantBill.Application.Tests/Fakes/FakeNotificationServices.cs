using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeTableNotificationService : ITableNotificationService
{
    public Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status) => Task.CompletedTask;
    public Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice) => Task.CompletedTask;
    public Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId) => Task.CompletedTask;
}

public class FakeCashierNotificationService : ICashierNotificationService
{
    public Task SendOrdersChangedAsync(Guid restaurantId) => Task.CompletedTask;
}
