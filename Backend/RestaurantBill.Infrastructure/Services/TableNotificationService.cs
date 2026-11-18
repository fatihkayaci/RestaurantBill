using Microsoft.AspNetCore.SignalR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Hubs;

namespace RestaurantBill.Infrastructure.Services
{
    public class TableNotificationService : ITableNotificationService
    {
        private readonly IHubContext<TableHub> _hubContext;
        private readonly IHubContext<CashierHub> _cashierHubContext;

        public TableNotificationService(IHubContext<TableHub> hubContext, IHubContext<CashierHub> cashierHubContext)
        {
            _hubContext = hubContext;
            _cashierHubContext = cashierHubContext;
        }

        public async Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("TableStatusChanged", tableId, status);
        }

        public async Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice, string createdByUserName)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrderUpdated", tableId, totalPrice, createdByUserName);
        }

        public async Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("OrderClosed", tableId, orderId);
        }

        public async Task SendCustomerRequestsChangedAsync(Guid restaurantId)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("CustomerRequestsChanged");
        }

        public async Task SendBillRequestChangedAsync(Guid restaurantId, Guid tableId, DateTime? billRequestedAt)
        {
            await _hubContext.Clients.Group(HubGroups.Restaurant(restaurantId)).SendAsync("BillRequestChanged", tableId, billRequestedAt);
        }

        // Masanın bölgesine tamamen bakan garsonlar + bu masayı seçmiş garsonlar + bölgesi boş (tüm bölgelere bakan)
        // garsonlar. Bir garson bu gruplardan yalnızca birinde olabilir (bkz. HubGroups.ForWaiter), bu yüzden aynı olayı
        // iki kez almaz. Masanın bölgesi her zaman vardır (Table.RegionId zorunlu). Kasiyer, yönetici ve mutfak bu olayı almaz.
        public async Task SendItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload)
        {
            string[] groups = HubGroups.ItemsReadyTargets(restaurantId, payload.RegionId, payload.TableId);
            await _hubContext.Clients.Groups(groups).SendAsync("ItemsReady", payload);
        }

        // Paket siparişte masa ve garson yoktur: aynı olay kasiyer hub'ının online sipariş grubuna gider.
        public async Task SendDeliveryItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload)
        {
            await _cashierHubContext.Clients.Group(HubGroups.OnlineOrders(restaurantId)).SendAsync("ItemsReady", payload);
        }

        // Garsonlar "ürün hazır" ile aynı gruplardan (TableHub) alır. Yönetici paneli masa hub'ının garson gruplarında
        // olmadığı için aynı olay kasiyer hub'ındaki yönetici grubuna da gider; kasiyer ekranları almaz.
        public async Task SendWaiterCalledAsync(Guid restaurantId, WaiterCalledDto payload)
        {
            string[] groups = HubGroups.WaiterCallTargets(restaurantId, payload.RegionId, payload.TableId);
            await _hubContext.Clients.Groups(groups).SendAsync("WaiterCalled", payload);
            await _cashierHubContext.Clients.Group(HubGroups.BranchManagers(restaurantId)).SendAsync("WaiterCalled", payload);
        }

        // Same audience as a waiter call: the table's waiters on the table hub and the branch managers on the cashier hub.
        // Every staff screen still refreshes its pending list through "CustomerRequestsChanged"; this event only drives
        // the toast and sound, so it never reaches another branch or the cashier/kitchen screens.
        public async Task SendOrderRequestCreatedAsync(Guid restaurantId, OrderRequestCreatedDto payload)
        {
            string[] groups = HubGroups.OrderRequestTargets(restaurantId, payload.RegionId, payload.TableId);
            await _hubContext.Clients.Groups(groups).SendAsync("OrderRequestCreated", payload);
            await _cashierHubContext.Clients.Group(HubGroups.BranchManagers(restaurantId)).SendAsync("OrderRequestCreated", payload);
        }

        // Only the table's waiters: cashier and manager screens already get "BillRequested" on the cashier hub.
        public async Task SendCustomerBillRequestedAsync(Guid restaurantId, WaiterCalledDto payload)
        {
            string[] groups = HubGroups.WaiterCallTargets(restaurantId, payload.RegionId, payload.TableId);
            await _hubContext.Clients.Groups(groups).SendAsync("CustomerBillRequested", payload);
        }

        // Branch managers always; the table's waiters too when the event is about a table (reservations).
        public async Task SendCustomerActivityAsync(Guid restaurantId, CustomerActivityDto payload)
        {
            if (payload.TableId is Guid tableId && payload.RegionId is Guid regionId)
            {
                string[] groups = HubGroups.WaiterCallTargets(restaurantId, regionId, tableId);
                await _hubContext.Clients.Groups(groups).SendAsync("CustomerActivity", payload);
            }
            await _cashierHubContext.Clients.Group(HubGroups.BranchManagers(restaurantId)).SendAsync("CustomerActivity", payload);
        }
    }
}
