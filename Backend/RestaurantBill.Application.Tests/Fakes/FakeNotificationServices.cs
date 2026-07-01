using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeTableNotificationService : ITableNotificationService
{
    public Task SendTableStatusChangedAsync(int tableId, int status) => Task.CompletedTask;
    public Task SendOrderUpdatedAsync(int tableId) => Task.CompletedTask;
    public Task SendOrderClosedAsync(int tableId, int orderId) => Task.CompletedTask;
}

public class FakeCashierNotificationService : ICashierNotificationService
{
    public Task SendOrderServedAsync() => Task.CompletedTask;
}
