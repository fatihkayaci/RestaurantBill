using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CustomerSite;

// Müşteri taleplerinin aşaması (OrderRequestStages.Derive) için gereken kalem durumlarını tek sorguda okur.
public static class OrderRequestStageReader
{
    public sealed record RequestRow(Guid Id, OrderRequestStatus Status, bool ItemsLinked, Guid? OrderId);

    public static async Task<Dictionary<Guid, OrderRequestStage>> LoadAsync(
        IAppDbContext db, IReadOnlyCollection<RequestRow> requests, CancellationToken cancellationToken)
    {
        List<Guid> approvedIds = requests.Where(r => r.Status == OrderRequestStatus.Approved).Select(r => r.Id).ToList();

        // Menü satırının durumu içeriğinden türetilir; içeriği olan menü satırı sayılmaz (içerik zaten sayılır).
        List<(Guid RequestId, OrderItemStatus Status, bool IsSetMenu)> items = [];
        if (approvedIds.Count > 0)
        {
            var rows = await db.OrderItems.AsNoTracking()
                .Where(i => i.OrderRequestId != null && approvedIds.Contains(i.OrderRequestId.Value))
                .Select(i => new { RequestId = i.OrderRequestId!.Value, i.Status, IsSetMenu = i.SetMenuId != null })
                .ToListAsync(cancellationToken);
            items = rows.Select(r => (r.RequestId, r.Status, r.IsSetMenu)).ToList();
        }

        // Eski (kalemleri bağlanmamış) talepler için hesabın kapanıp kapanmadığı.
        List<Guid> legacyOrderIds = requests
            .Where(r => r.Status == OrderRequestStatus.Approved && !r.ItemsLinked && r.OrderId is not null)
            .Select(r => r.OrderId!.Value).Distinct().ToList();
        HashSet<Guid> closedOrderIds = legacyOrderIds.Count == 0 ? [] : (await db.Orders.AsNoTracking()
            .Where(o => legacyOrderIds.Contains(o.Id) && (o.Status == OrderStatus.Paid || o.Status == OrderStatus.Cancelled))
            .Select(o => o.Id)
            .ToListAsync(cancellationToken)).ToHashSet();

        var result = new Dictionary<Guid, OrderRequestStage>(requests.Count);
        foreach (RequestRow request in requests)
        {
            var own = items.Where(i => i.RequestId == request.Id).ToList();
            List<OrderItemStatus> statuses = (own.Any(i => !i.IsSetMenu) ? own.Where(i => !i.IsSetMenu) : own)
                .Select(i => i.Status).ToList();
            bool orderClosed = request.OrderId is Guid orderId && closedOrderIds.Contains(orderId);
            result[request.Id] = OrderRequestStages.Derive(request.Status, request.ItemsLinked, orderClosed, statuses);
        }
        return result;
    }
}
