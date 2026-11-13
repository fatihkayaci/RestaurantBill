using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Infrastructure.Services;
public class CashierNotificationService : ICashierNotificationService
{
    private readonly IHubContext<CashierHub> _hubContext;

    public CashierNotificationService(IHubContext<CashierHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendOrdersChangedAsync(Guid restaurantId)
    {
        await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrdersChanged");
    }

    public async Task SendShiftAutoClosedAsync(Guid restaurantId, string cashRegisterName)
    {
        await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("ShiftAutoClosed", cashRegisterName);
    }

    public async Task SendShiftsChangedAsync(Guid restaurantId)
    {
        await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("ShiftsChanged");
    }

    public async Task SendOrderItemsOverdueAsync(Guid restaurantId, IReadOnlyList<OverdueOrderItemDto> items)
    {
        await _hubContext.Clients.Group(HubGroups.BranchManagers(restaurantId)).SendAsync("OrderItemsOverdue", items);
    }

    // Kasiyer hub'ına yalnızca kasiyer ve yönetici ekranları bağlanır; garsonlar bu olayı almaz.
    public async Task SendBillRequestedAsync(Guid restaurantId, Guid tableId, string tableName, string requestedByName)
    {
        await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("BillRequested", tableId, tableName, requestedByName);
    }
}
