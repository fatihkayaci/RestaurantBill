namespace RestaurantBill.Application.Interfaces;

// Mutfak hub'ı (/kitchen-hub). Mutfak ekranı "ReceiveNewOrder" gelince listesini yeniler.
public interface IKitchenNotificationService
{
    /// <summary>Şubenin mutfağına yeni ya da kalkan bir bilet olduğunu haber verir (ör. paket sipariş kabul/iptal).</summary>
    Task SendOrdersChangedAsync(Guid restaurantId);
}
