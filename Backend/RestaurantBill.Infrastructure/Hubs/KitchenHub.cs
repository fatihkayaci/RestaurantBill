using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RestaurantBill.Infrastructure.Hubs
{
    [Authorize]
    public class KitchenHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            string? restaurantId = Context.User?.FindFirst("RestaurantId")?.Value;
            if (Guid.TryParse(restaurantId, out Guid id))
                await Groups.AddToGroupAsync(Context.ConnectionId, HubGroups.Restaurant(id));

            await base.OnConnectedAsync();
        }
    }
}