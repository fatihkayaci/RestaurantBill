using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;
public interface ITableNotificationService
{
    Task SendTableStatusChangedAsync(Guid restaurantId, Guid tableId, int status);
    Task SendOrderUpdatedAsync(Guid restaurantId, Guid tableId, decimal totalPrice, string createdByUserName);
    Task SendOrderClosedAsync(Guid restaurantId, Guid tableId, Guid orderId);
    // Müşteri sipariş/rezervasyon talebi geldi ya da işlendi; personel ekranları listeyi yeniler.
    Task SendCustomerRequestsChangedAsync(Guid restaurantId);
    // Masanın "hesap istendi" durumu değişti (billRequestedAt null = istek kalktı); masa ekranları rozeti günceller.
    Task SendBillRequestChangedAsync(Guid restaurantId, Guid tableId, DateTime? billRequestedAt);
    // Mutfak ürünleri hazır (pasada) işaretledi; yalnızca masanın bölgesine bakan garsonlara gider.
    Task SendItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload);
    // Paket siparişin ürünleri hazır: garsona değil, şubenin online sipariş ekranlarına (OnlineOrders) gider.
    Task SendDeliveryItemsReadyAsync(Guid restaurantId, ItemsReadyDto payload);
    // Müşteri QR'dan garson çağırdı; "ürün hazır" ile aynı garsonlara, ayrıca şube yöneticilerine gider.
    Task SendWaiterCalledAsync(Guid restaurantId, WaiterCalledDto payload);
    // A customer sent an order from the table QR menu; same recipients as a waiter call (table's waiters + branch managers).
    Task SendOrderRequestCreatedAsync(Guid restaurantId, OrderRequestCreatedDto payload);
    // A customer asked for the bill from the table QR menu; goes to the table's waiters (cashiers and managers get "BillRequested").
    Task SendCustomerBillRequestedAsync(Guid restaurantId, WaiterCalledDto payload);
    // Reservation request/cancel/pre-order or contact message from the public site; branch managers, plus the
    // table's waiters when a table is involved.
    Task SendCustomerActivityAsync(Guid restaurantId, CustomerActivityDto payload);
}