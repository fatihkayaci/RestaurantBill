using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Delivery;

// Mutfak durumundan paket siparişin müşteri durumunu ilerletir (Accepted → Preparing → Ready). Mutfak durum
// handler'ları kaydetmeden önce AdvanceDeliveryFromKitchenAsync'i, kaydettikten sonra NotifyDeliveryAdvancedAsync'i çağırır:
//   DeliveryOrder? advanced = await _db.AdvanceDeliveryFromKitchenAsync(order, ct);
//   await _db.SaveChangesAsync(ct);
//   await _cashierNotificationService.NotifyDeliveryAdvancedAsync(advanced);
public static class DeliveryKitchenSync
{
    /// <summary>Durumu değiştiyse paket sipariş (kaydedilmemiş), değişmediyse ya da masa siparişiyse null.</summary>
    public static async Task<DeliveryOrder?> AdvanceDeliveryFromKitchenAsync(this IAppDbContext db, Order order, CancellationToken cancellationToken)
    {
        if (!order.IsPackageOrder)
            return null;

        DeliveryOrder? delivery = await db.DeliveryOrders.FirstOrDefaultAsync(d => d.OrderId == order.Id, cancellationToken);
        if (delivery is null)
            return null;

        // Sipariş durumu ve ürünlerden türetilen durum: kalem kalem "hazır" denince sipariş durumu değişmeyebilir.
        bool changed = delivery.AdvanceFromKitchen(order.Status);
        changed |= delivery.AdvanceFromKitchen(KitchenStatusOf(order));
        return changed ? delivery : null;
    }

    /// <summary>
    /// Kasa ekranlarına durum değişikliği; sipariş Hazır olduysa ve kuryesi atanmışsa kuryenin ekranına da ("Yola
    /// çıktım" açılsın diye).
    /// </summary>
    public static async Task NotifyDeliveryAdvancedAsync(this ICashierNotificationService notifications, DeliveryOrder? advanced,
        ICourierNotificationService? courierNotifications = null)
    {
        if (advanced is null)
            return;

        await notifications.SendDeliveryOrdersChangedAsync(advanced.BranchId, new DeliveryOrdersChangedDto { Id = advanced.Id, Status = advanced.Status });
        if (courierNotifications is not null && advanced.Status == DeliveryOrderStatus.Ready && advanced.CourierUserId is Guid courierId)
            await courierNotifications.SendCourierOrdersChangedAsync(advanced.BranchId, courierId, advanced.Id);
    }

    public const string DispatchedAddItemsMessage = "Yola çıkmış paket siparişe ürün eklenemez.";

    /// <summary>
    /// Yola çıkmış ya da teslim edilmiş paket siparişe ürün/menü eklenemez: kurye müşteriden onaylanan toplamı alır,
    /// hesap büyürse kasadaki "Teslim al" tutar farkıyla durur. Masa siparişinde ve yola çıkmamış pakette null.
    /// </summary>
    public static async Task<string?> CheckDeliveryAcceptsItemsAsync(this IAppDbContext db, Order order, CancellationToken cancellationToken)
    {
        if (!order.IsPackageOrder)
            return null;

        DeliveryOrderStatus? status = await db.DeliveryOrders
            .Where(d => d.OrderId == order.Id)
            .Select(d => (DeliveryOrderStatus?)d.Status)
            .FirstOrDefaultAsync(cancellationToken);
        return status is DeliveryOrderStatus.OnTheWay or DeliveryOrderStatus.Delivered ? DispatchedAddItemsMessage : null;
    }

    // Menü satırının durumu içindeki ürünlerden türer; sayılmaz. Tüm ürünler hazır ya da servis edildiyse Hazır,
    // en az biri hazırlanmaya başladıysa Hazırlanıyor.
    public static OrderStatus KitchenStatusOf(Order order)
    {
        List<OrderItem> items = order.OrderItems.Where(i => !i.IsSetMenu).ToList();
        if (items.Count > 0 && items.All(i => i.Status >= OrderItemStatus.Ready))
            return OrderStatus.Ready;
        if (items.Any(i => i.Status >= OrderItemStatus.Preparing))
            return OrderStatus.Preparing;
        return order.Status;
    }
}
