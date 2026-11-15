namespace RestaurantBill.Domain.Enums;

public enum OrderRequestKind
{
    // Müşterinin masadaki QR'dan gönderdiği talep.
    TableQr = 1,
    // Rezervasyonu olan müşterinin önceden verdiği sipariş; misafir gelene ("Geldi") kadar bekler.
    PreOrder = 2
}
