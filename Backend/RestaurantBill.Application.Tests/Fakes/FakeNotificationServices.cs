using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeTableNotificationService : ITableNotificationService
{
    public Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status) => Task.CompletedTask;
    public Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice, string createdByUserName) => Task.CompletedTask;
    public Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId) => Task.CompletedTask;
    public int CustomerRequestsChangedCount { get; private set; }
    public Task SendCustomerRequestsChangedAsync(Guid restaurantId)
    {
        CustomerRequestsChangedCount++;
        return Task.CompletedTask;
    }
    public List<(Guid TableId, DateTime? BillRequestedAt)> BillRequestChanges { get; } = [];
    public Task SendBillRequestChangedAsync(Guid restaurantId, Guid tableId, DateTime? billRequestedAt)
    {
        BillRequestChanges.Add((tableId, billRequestedAt));
        return Task.CompletedTask;
    }
}

public class FakeCashierNotificationService : ICashierNotificationService
{
    public Task SendOrdersChangedAsync(Guid restaurantId) => Task.CompletedTask;
    public Task SendShiftAutoClosedAsync(Guid restaurantId, string cashRegisterName) => Task.CompletedTask;
    public int ShiftsChangedCount { get; private set; }
    public Task SendShiftsChangedAsync(Guid restaurantId)
    {
        ShiftsChangedCount++;
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, IReadOnlyList<OverdueOrderItemDto> Items)> OverdueSent { get; } = [];
    public Task SendOrderItemsOverdueAsync(Guid restaurantId, IReadOnlyList<OverdueOrderItemDto> items)
    {
        OverdueSent.Add((restaurantId, items));
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, Guid TableId, string TableName, string RequestedBy)> BillRequestsSent { get; } = [];
    public Task SendBillRequestedAsync(Guid restaurantId, Guid tableId, string tableName, string requestedByName)
    {
        BillRequestsSent.Add((restaurantId, tableId, tableName, requestedByName));
        return Task.CompletedTask;
    }
}
