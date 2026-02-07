namespace RestaurantBill.Core;
public enum OrderStatus
{
    Pending = 1,     // Sipariş alındı, onay bekliyor (Henüz mutfağa gitmedi)
    Preparing = 2,   // Hazırlanıyor (Mutfak onayladı)
    Ready = 3,       // Hazır (Garsonun almasını bekliyor)
    Served = 4,      // Servis edildi (Müşterinin önünde)
    Paid = 5,        // Ödendi / Kapandı
    Cancelled = 6    // İptal edildi
}