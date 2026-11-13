using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Overdue;

public static class OverdueOrderItems
{
    // Sunucu uzun süre kapalı kaldıysa açılışta günlerce önceki unutulmuş kalemler için uyarı
    // yağmasın: yalnızca son birkaç saatte gecikmeye düşenler dikkate alınır.
    public static readonly TimeSpan LookBack = TimeSpan.FromHours(6);

    /// <summary>
    /// Süresi olan, mutfakta bekleyen/hazırlanan ve açık bir siparişe ait kalemler (gecikme kontrolü bellekte yapılır).
    /// CreatedAt alt sınırı: en uzun hazırlanma süresi + LookBack.
    /// </summary>
    public static IQueryable<OrderItem> Candidates(IAppDbContext db, DateTime utcNow)
    {
        DateTime earliest = utcNow - LookBack - TimeSpan.FromMinutes(Product.PrepMinutesMax);
        return db.OrderItems
            .Include(i => i.Product)
            .Include(i => i.Order).ThenInclude(o => o.Table).ThenInclude(t => t.Region)
            .Where(i => i.PrepMinutes != null
                && (i.Status == OrderItemStatus.Pending || i.Status == OrderItemStatus.Preparing)
                && i.CreatedAt >= earliest
                && i.CreatedAt <= utcNow
                && i.Order.Status != OrderStatus.Paid && i.Order.Status != OrderStatus.Cancelled
                && !i.Order.IsDeleted);
    }

    public static OverdueOrderItemDto ToOverdueDto(this OrderItem item) => new()
    {
        OrderItemId = item.Id,
        OrderId = item.OrderId,
        TableId = item.Order.TableId,
        TableName = item.Order.Table?.Name ?? string.Empty,
        ProductName = item.Product?.Name ?? string.Empty,
        Quantity = item.Quantity,
        PrepMinutes = item.PrepMinutes ?? 0,
        CreatedAt = item.CreatedAt,
        DueAt = item.GetDueAt() ?? item.CreatedAt,
    };
}

public class OverdueOrderItemNotifier : IOverdueOrderItemNotifier
{
    private readonly IAppDbContext _db;
    private readonly ICashierNotificationService _notifications;

    public OverdueOrderItemNotifier(IAppDbContext db, ICashierNotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<int> NotifyNewlyOverdueAsync(DateTime utcNow, CancellationToken cancellationToken)
    {
        List<OrderItem> candidates = await OverdueOrderItems.Candidates(_db, utcNow)
            .Where(i => i.OverdueNotifiedAt == null)
            .ToListAsync(cancellationToken);

        List<OrderItem> newlyOverdue = candidates
            .Where(i => i.Order.Table?.Region is not null && i.TryMarkOverdueNotified(utcNow))
            .ToList();
        if (newlyOverdue.Count == 0)
            return 0;

        // Önce işaretlenir: kayıt başarısız olursa uyarı da gitmez, bir sonraki tikte yeniden denenir.
        // Böylece bir kalem için iki kez uyarı gitmez.
        await _db.SaveChangesAsync(cancellationToken);

        foreach (IGrouping<Guid, OrderItem> branch in newlyOverdue.GroupBy(i => i.Order.Table.Region.BranchId))
        {
            List<OverdueOrderItemDto> items = branch
                .OrderBy(i => i.GetDueAt())
                .Select(i => i.ToOverdueDto())
                .ToList();
            await _notifications.SendOrderItemsOverdueAsync(branch.Key, items);
        }

        return newlyOverdue.Count;
    }
}
