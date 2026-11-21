namespace RestaurantBill.Domain.Enums;

public enum OrderType
{
    // Masada açılan sipariş; TableId doludur.
    DineIn = 1,
    // Online paket sipariş; masası yoktur, DeliveryOrder kabul edilince açılır.
    Delivery = 2,
    // Online gel al: masası ve teslimat ücreti yoktur; müşteri restorana gelip alır. DeliveryOrder kabul edilince açılır.
    Takeaway = 3
}
