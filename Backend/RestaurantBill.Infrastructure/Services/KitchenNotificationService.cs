using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Infrastructure.Services;

// Mutfak ekranı /kitchen-hub'da "ReceiveNewOrder" dinler ve listesini yeniden çeker.
public class KitchenNotificationService(IHubContext<KitchenHub> hubContext) : IKitchenNotificationService
{
    public Task SendOrdersChangedAsync(Guid restaurantId)
        => hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("ReceiveNewOrder");
}
