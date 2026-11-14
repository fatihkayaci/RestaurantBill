using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Delivery.Staff;

/// <summary>
/// Arka plan süpürücüsü: şubenin AutoRejectAfterMinutes süresi içinde yanıtlanmayan siparişleri reddeder. Müşteri
/// takip sayfasında "Restoran şu an yanıt veremedi." görür. Aynı turda misafiri gelmeyen rezervasyonların ön siparişlerinin
/// süresi doldurulur (ExpirePreOrdersAsync).
/// </summary>
public class DeliveryOrderSweeper(
    IAppDbContext db, ICashierNotificationService notifications, ITableNotificationService? tableNotifications = null) : IDeliveryOrderSweeper
{
    public async Task<int> AutoRejectStaleAsync(DateTime utcNow, CancellationToken cancellationToken)
    {
        // Ön süzgeç en kısa izin verilen süreyle; her siparişin kesin süresi şubesinin ayarından gelir.
        DateTime candidatesBefore = utcNow.AddMinutes(-OnlineOrderSettings.AutoRejectMin);
        List<DeliveryOrder> candidates = await db.DeliveryOrders
            .Where(d => d.Status == DeliveryOrderStatus.Received && d.CreatedAt <= candidatesBefore && !d.IsDeleted)
            .ToListAsync(cancellationToken);
        if (candidates.Count == 0)
            return 0;

        List<Guid> branchIds = candidates.Select(d => d.BranchId).Distinct().ToList();
        Dictionary<Guid, int> afterMinutes = (await db.Branches.AsNoTracking().Where(b => branchIds.Contains(b.Id)).ToListAsync(cancellationToken))
            .ToDictionary(b => b.Id, b => b.GetOnlineOrderSettings().AutoRejectAfterMinutes);

        List<DeliveryOrder> rejected = [];
        foreach (DeliveryOrder order in candidates)
        {
            int minutes = afterMinutes.GetValueOrDefault(order.BranchId, OnlineOrderSettings.DefaultAutoRejectAfterMinutes);
            if (utcNow < order.CreatedAt.AddMinutes(minutes))
                continue;

            order.AutoReject(utcNow, minutes);
            db.AddAudit(order, "Sistem", "DeliveryOrderAutoRejected",
                $"Online paket sipariş #{order.Number} {minutes} dakikada yanıtlanmadığı için otomatik reddedildi.", AuditLogSeverity.Warning);
            rejected.Add(order);
        }

        if (rejected.Count == 0)
            return 0;

        // Önce kaydedilir: kayıt başarısız olursa bildirim de gitmez, bir sonraki turda yeniden denenir.
        await db.SaveChangesAsync(cancellationToken);

        foreach (DeliveryOrder order in rejected)
            await notifications.SendDeliveryOrdersChangedAsync(order.BranchId, new DeliveryOrdersChangedDto { Id = order.Id, Status = order.Status });

        return rejected.Count;
    }

    /// <summary>
    /// Rezervasyon saati + 30 dk geçtiği hâlde misafiri oturtulmamış (SeatedAt yok) rezervasyonların bekleyen ön siparişleri
    /// Expired olur. Rezervasyonun kendisine dokunulmaz: "gelmedi" yalnızca personelin işaretidir. Personel ekranına
    /// "Rezervasyon {ad} gelmedi mi?" uyarısı denetim kaydı olarak düşer.
    /// </summary>
    public async Task<int> ExpirePreOrdersAsync(DateTime utcNow, CancellationToken cancellationToken)
    {
        DateTime reservationBefore = utcNow.AddMinutes(-PreOrderRules.CloseAfterMinutes);
        List<OrderRequest> stale = await db.OrderRequests
            .Include(r => r.Reservation)
            .Include(r => r.Table).ThenInclude(t => t.Region)
            .Where(r => r.Kind == OrderRequestKind.PreOrder
                && r.Status == OrderRequestStatus.Pending
                && r.Reservation != null
                && r.Reservation.SeatedAt == null
                && r.Reservation.ReservationTime < reservationBefore)
            .ToListAsync(cancellationToken);
        if (stale.Count == 0)
            return 0;

        foreach (OrderRequest preOrder in stale)
        {
            preOrder.Expire();
            Reservation reservation = preOrder.Reservation!;
            db.AuditLogs.Add(AuditLog.Create(preOrder.Table.Region.BranchId, "Sistem", AuditLogCategory.Order, AuditLogSeverity.Warning,
                "PreOrderExpired",
                $"Rezervasyon {reservation.GuestName} gelmedi mi? {preOrder.Table.Name} masasının ön siparişinin süresi doldu; mutfağa gönderilmedi.",
                nameof(Reservation), reservation.Id));
        }

        await db.SaveChangesAsync(cancellationToken);

        if (tableNotifications is not null)
            foreach (Guid branchId in stale.Select(r => r.Table.Region.BranchId).Distinct())
                await tableNotifications.SendCustomerRequestsChangedAsync(branchId);

        return stale.Count;
    }
}
