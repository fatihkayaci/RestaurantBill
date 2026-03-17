namespace RestaurantBill.Domain.Enums;
public enum OrderStatus
{
    Active = 1,
    Pending = 2,     // Sipariş alındı, onay bekliyor (Henüz mutfağa gitmedi)
    Preparing = 3,   // Hazırlanıyor (Mutfak onayladı)
    Ready = 4,       // Hazır (Garsonun almasını bekliyor)
    Served = 5,      // Servis edildi (Müşterinin önünde)
    Paid = 6,        // Ödendi / Kapandı
    Cancelled = 7    // İptal edildi
}