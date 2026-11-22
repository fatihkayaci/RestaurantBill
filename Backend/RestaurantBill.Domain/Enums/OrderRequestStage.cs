namespace RestaurantBill.Domain.Enums;

/// <summary>
/// Müşterinin gördüğü sipariş aşaması (QR sipariş zaman çizelgesi). Talep durumundan ve talebin hesaba yazılan
/// kalemlerinin mutfak durumlarından türetilir (OrderRequestStages.Derive); saklanmaz.
/// </summary>
public enum OrderRequestStage
{
    // Gönderildi, garson onayı bekleniyor.
    Sent = 1,
    // Onaylandı, mutfakta henüz başlanmadı.
    Approved = 2,
    Preparing = 3,
    // Bütün kalemler hazır: "Masanıza geliyor".
    OnTheWay = 4,
    Served = 5,
    Rejected = 6,
    // İptal edildi ya da süresi doldu (ön sipariş).
    Cancelled = 7,
}
