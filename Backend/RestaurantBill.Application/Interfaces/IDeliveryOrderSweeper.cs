namespace RestaurantBill.Application.Interfaces;

// Arka plan görevi (DeliveryAutoRejectService) bunu periyodik çağırır.
public interface IDeliveryOrderSweeper
{
    /// <summary>
    /// Süresi içinde yanıtlanmayan (Received) online siparişleri şube ayarına göre otomatik reddeder ve
    /// bildirir. Reddedilen sipariş sayısını döner.
    /// </summary>
    Task<int> AutoRejectStaleAsync(DateTime utcNow, CancellationToken cancellationToken);

    /// <summary>Misafiri rezervasyon saati + 30 dk içinde gelmeyen ön siparişleri Expired yapar; sayısını döner.</summary>
    Task<int> ExpirePreOrdersAsync(DateTime utcNow, CancellationToken cancellationToken);
}
