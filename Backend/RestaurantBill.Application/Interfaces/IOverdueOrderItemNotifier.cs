namespace RestaurantBill.Application.Interfaces;

public interface IOverdueOrderItemNotifier
{
    /// <summary>
    /// Yeni gecikmiş kalemleri bulur, her birini bir kez işaretler ve şubenin yöneticilerine bildirir.
    /// Bildirilen kalem sayısını döner.
    /// </summary>
    Task<int> NotifyNewlyOverdueAsync(DateTime utcNow, CancellationToken cancellationToken);
}
