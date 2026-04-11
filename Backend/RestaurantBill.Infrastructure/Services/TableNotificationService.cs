using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Infrastructure.Services
{
    public class TableNotificationService : ITableNotificationService
    {
        private readonly IHubContext<KitchenHub> _hubContext;

        public TableNotificationService(IHubContext<KitchenHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendTableStatusChangedAsync(int tableId, int status)
        {
            await _hubContext.Clients.All.SendAsync("TableStatusChanged", tableId, status);
        }
    }
}
