namespace RestaurantBill.Domain.Enums;

// Online paket siparişin müşteri tarafındaki yaşam döngüsü. Geçişler DeliveryOrder üzerinde korunur.
public enum DeliveryOrderStatus
{
    Received = 1,
    Accepted = 2,
    Preparing = 3,
    Ready = 4,
    OnTheWay = 5,
    Delivered = 6,
    Rejected = 7,
    Cancelled = 8
}
