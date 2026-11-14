namespace RestaurantBill.Domain.Enums;

public enum OrderType
{
    // Masada açılan sipariş; TableId doludur.
    DineIn = 1,
    // Online paket sipariş; masası yoktur, DeliveryOrder kabul edilince açılır.
    Delivery = 2,
    // Gel-al: şimdilik akışı yok, değer ileride kullanılmak üzere ayrıldı.
    Takeaway = 3
}
