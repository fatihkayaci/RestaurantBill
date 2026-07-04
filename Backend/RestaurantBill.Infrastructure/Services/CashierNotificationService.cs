using Microsoft.AspNetCore.SignalR;
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

    public async Task SendOrderServedAsync(int restaurantId)
    {
        await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrderServed");
    }
}
