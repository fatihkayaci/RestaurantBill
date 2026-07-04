using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Infrastructure.Services
{
    public class TableNotificationService : ITableNotificationService
    {
        private readonly IHubContext<TableHub> _hubContext;

        public TableNotificationService(IHubContext<TableHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendTableStatusChangedAsync(int restaurantId, int tableId, int status)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("TableStatusChanged", tableId, status);
        }

        public async Task SendOrderUpdatedAsync(int restaurantId, int tableId, decimal totalPrice)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrderUpdated", tableId, totalPrice);
        }

        public async Task SendOrderClosedAsync(int restaurantId, int tableId, int orderId)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrderClosed", tableId, orderId);
        }
    }
}
