using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Integration.Tests.Infrastructure;

public class NullCashierNotificationService : ICashierNotificationService
{
    public Task SendOrdersChangedAsync(Guid restaurantId) => Task.CompletedTask;
    public Task SendShiftAutoClosedAsync(Guid restaurantId, string cashRegisterName) => Task.CompletedTask;
    public Task SendShiftsChangedAsync(Guid restaurantId) => Task.CompletedTask;
    public Task SendOrderItemsOverdueAsync(Guid restaurantId, IReadOnlyList<OverdueOrderItemDto> items) => Task.CompletedTask;
    public Task SendBillRequestedAsync(Guid restaurantId, Guid tableId, string tableName, string requestedByName) => Task.CompletedTask;
}
