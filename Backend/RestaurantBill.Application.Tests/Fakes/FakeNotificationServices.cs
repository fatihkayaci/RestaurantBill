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
    public List<(Guid BranchId, ItemsReadyDto Payload)> ItemsReadySent { get; } = [];
    public Task SendItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload)
    {
        ItemsReadySent.Add((restaurantId, payload));
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, ItemsReadyDto Payload)> DeliveryItemsReadySent { get; } = [];
    public Task SendDeliveryItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload)
    {
        DeliveryItemsReadySent.Add((restaurantId, payload));
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, WaiterCalledDto Payload)> WaiterCallsSent { get; } = [];
    public Task SendWaiterCalledAsync(Guid restaurantId, WaiterCalledDto payload)
    {
        WaiterCallsSent.Add((restaurantId, payload));
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, OrderRequestCreatedDto Payload)> OrderRequestsCreated { get; } = [];
    public Task SendOrderRequestCreatedAsync(Guid restaurantId, OrderRequestCreatedDto payload)
    {
        OrderRequestsCreated.Add((restaurantId, payload));
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, WaiterCalledDto Payload)> CustomerBillRequestsSent { get; } = [];
    public Task SendCustomerBillRequestedAsync(Guid restaurantId, WaiterCalledDto payload)
    {
        CustomerBillRequestsSent.Add((restaurantId, payload));
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, CustomerActivityDto Payload)> CustomerActivities { get; } = [];
    public Task SendCustomerActivityAsync(Guid restaurantId, CustomerActivityDto payload)
    {
        CustomerActivities.Add((restaurantId, payload));
        return Task.CompletedTask;
    }
}

public class FakeCashierNotificationService : ICashierNotificationService
{
    public int OrdersChangedCount { get; private set; }
    public Task SendOrdersChangedAsync(Guid restaurantId)
    {
        OrdersChangedCount++;
        return Task.CompletedTask;
    }
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
    public Task SendBillRequestedAsync(Guid restaurantId, Guid regionId, Guid tableId, string tableName, string requestedByName)
    {
        BillRequestsSent.Add((restaurantId, tableId, tableName, requestedByName));
        return Task.CompletedTask;
    }
    public List<(Guid BranchId, DeliveryOrdersChangedDto Payload)> DeliveryOrdersChanged { get; } = [];
    public Task SendDeliveryOrdersChangedAsync(Guid restaurantId, DeliveryOrdersChangedDto payload)
    {
        DeliveryOrdersChanged.Add((restaurantId, payload));
        return Task.CompletedTask;
    }
}

public class FakeKitchenNotificationService : IKitchenNotificationService
{
    public List<Guid> OrdersChanged { get; } = [];
    public Task SendOrdersChangedAsync(Guid restaurantId)
    {
        OrdersChanged.Add(restaurantId);
        return Task.CompletedTask;
    }
}

public class FakeCourierNotificationService : ICourierNotificationService
{
    public List<(Guid BranchId, Guid CourierUserId, Guid? DeliveryOrderId)> Sent { get; } = [];
    public Task SendCourierOrdersChangedAsync(Guid restaurantId, Guid courierUserId, Guid? deliveryOrderId = null)
    {
        Sent.Add((restaurantId, courierUserId, deliveryOrderId));
        return Task.CompletedTask;
    }
}
