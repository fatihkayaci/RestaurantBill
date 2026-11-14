using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.ItemsReady;

// Durum değiştiren handler'ların ortak "ürün hazır" bildirimi. Kullanım:
//   HashSet<Guid> notReadyBefore = ItemsReadyNotification.NotReadyItemIds(order);
//   ... durum değişikliği + SaveChanges ...
//   await _db.SendItemsReadyAsync(_tableNotificationService, order, ItemsReadyNotification.NewlyReadyItemIds(order, notReadyBefore), ct);
// Yalnızca Hazır olmayan bir durumdan Hazır'a geçen kalemler bildirilir: Hazır → Hazır tekrar bildirim üretmez,
// geri alınıp yeniden hazır yapılan kalem ise yeniden bildirilir.
// Menüde mutfağın hazırladığı şey içindeki ürünlerdir: bildirim onlar için gider ("Adana Kebap (Adana Menü)"),
// durumu onlardan türeyen menü satırı ayrıca bildirilmez.
public static class ItemsReadyNotification
{
    public static HashSet<Guid> NotReadyItemIds(Order order) =>
        order.OrderItems
            .Where(i => !i.IsSetMenu && i.Status != OrderItemStatus.Ready)
            .Select(i => i.Id)
            .ToHashSet();

    public static List<Guid> NewlyReadyItemIds(Order order, HashSet<Guid> notReadyBefore) =>
        order.OrderItems
            .Where(i => !i.IsSetMenu && i.Status == OrderItemStatus.Ready && notReadyBefore.Contains(i.Id))
            .Select(i => i.Id)
            .ToList();

    // Kaydetme sonrası çağrılır: masa adı ve ürün adları veritabanından okunur, tek bir ItemsReady olayı gönderilir.
    public static async Task SendItemsReadyAsync(
        this IAppDbContext db, ITableNotificationService notifications, Order order, List<Guid> readyItemIds, CancellationToken cancellationToken)
    {
        if (readyItemIds.Count == 0)
            return;

        // Paket siparişte garson yoktur: bildirim şubenin online sipariş ekranlarına "PAKET #123 · Moda" adıyla gider.
        string tableName;
        Guid regionId;
        int? deliveryNumber = null;
        if (order.TableId is Guid tableId)
        {
            var table = await db.Tables.AsNoTracking()
                .Where(t => t.Id == tableId)
                .Select(t => new { t.Name, t.RegionId })
                .FirstOrDefaultAsync(cancellationToken);
            if (table is null)
                return;
            tableName = table.Name;
            regionId = table.RegionId;
        }
        else
        {
            var delivery = await db.DeliveryOrders.AsNoTracking()
                .Where(d => d.OrderId == order.Id)
                .Select(d => new { d.Number, d.ZoneName })
                .FirstOrDefaultAsync(cancellationToken);
            if (delivery is null)
                return;
            tableName = DeliveryScope.TicketName(delivery.Number, delivery.ZoneName);
            regionId = Guid.Empty;
            tableId = Guid.Empty;
            deliveryNumber = delivery.Number;
        }

        var rows = await db.OrderItems.AsNoTracking()
            .Where(i => readyItemIds.Contains(i.Id))
            .Select(i => new
            {
                i.Id,
                ProductName = i.Product!.Name,
                SetMenuName = i.ParentOrderItem != null ? i.ParentOrderItem.SetMenu!.Name : null,
                i.Quantity,
                i.Note
            })
            .ToListAsync(cancellationToken);

        List<ReadyOrderItemDto> items = rows
            .Select(r => new ReadyOrderItemDto
            {
                OrderItemId = r.Id,
                ProductName = r.SetMenuName is null ? r.ProductName : $"{r.ProductName} ({r.SetMenuName})",
                Quantity = r.Quantity,
                Note = r.Note == "" ? null : r.Note
            })
            .ToList();

        var payload = new ItemsReadyDto
        {
            OrderId = order.Id,
            TableId = tableId,
            TableName = tableName,
            RegionId = regionId,
            DeliveryNumber = deliveryNumber,
            Items = items,
            ReadyAt = DateTime.UtcNow
        };

        // Şube siparişin şubesidir: Owner birden çok şubeye erişebilir, garson grupları masanın şubesine göre kurulur.
        if (deliveryNumber is null)
            await notifications.SendItemsReadyAsync(order.BranchId, payload);
        else
            await notifications.SendDeliveryItemsReadyAsync(order.BranchId, payload);
    }
}
