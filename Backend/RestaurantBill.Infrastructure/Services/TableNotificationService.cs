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

        public async Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("TableStatusChanged", tableId, status);
        }

        public async Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrderUpdated", tableId, totalPrice);
        }

        public async Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrderClosed", tableId, orderId);
        }
    }
}
