using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Interfaces;

public interface ICashierNotificationService
{
    Task SendOrdersChangedAsync(Guid restaurantId);
    Task SendShiftAutoClosedAsync(Guid restaurantId, string cashRegisterName);
    /// <summary>Bir kasada gün başlatıldı/atandı: bekleyen kasiyer ekranları kendini yeniler.</summary>
    Task SendShiftsChangedAsync(Guid restaurantId);
    /// <summary>Yalnızca şubenin yöneticilerine (Admin/Owner) gider: hazırlanma süresini aşan kalemler.</summary>
    Task SendOrderItemsOverdueAsync(Guid restaurantId, IReadOnlyList<OverdueOrderItemDto> items);
    /// <summary>Garson bir masanın hesabını istedi: şubenin kasiyer ve yönetici ekranlarında uyarı (toast) çıkar.</summary>
    Task SendBillRequestedAsync(Guid restaurantId, Guid tableId, string tableName, string requestedByName);
}
