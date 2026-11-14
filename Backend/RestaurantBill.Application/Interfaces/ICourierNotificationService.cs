namespace RestaurantBill.Application.Interfaces;

// Kurye hub'ı (/courier-hub). Kurye ekranı "CourierOrdersChanged" gelince siparişlerini ve özetini yeniden çeker.
public interface ICourierNotificationService
{
    /// <summary>
    /// Kuryenin siparişleri değişti (atama, atamanın kaldırılması, iptal, yola çıkış/teslim, kasada teslim alma): olay o
    /// kuryeye ve şubenin kurye ekranlarını izleyen yöneticilerine gider.
    /// </summary>
    Task SendCourierOrdersChangedAsync(Guid restaurantId, Guid courierUserId, Guid? deliveryOrderId = null);
}
