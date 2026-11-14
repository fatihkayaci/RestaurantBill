using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace RestaurantBill.Infrastructure.Hubs;

// Kurye ekranı (/courier-hub). Kurye yalnızca kendi grubuna girer; Admin/Owner şubenin tüm kurye olaylarını izler.
[Authorize(Roles = "Courier,Admin,Owner")]
public class CourierHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        if (Guid.TryParse(Context.User?.FindFirst("RestaurantId")?.Value, out Guid branchId))
        {
            Guid? userId = Guid.TryParse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out Guid id) ? id : null;
            foreach (string group in HubGroups.ForCourierHub(branchId, userId, role => Context.User?.IsInRole(role) == true))
                await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }

        await base.OnConnectedAsync();
    }
}
