namespace RestaurantBill.Domain.Enums;

public enum ReservationStatus
{
    // Personelin açtığı, masayı hemen "Rezerve" yapan eski akış.
    Active = 1,
    Cancelled = 2,
    // Müşterinin siteden gönderdiği, saat aralıklı talepler.
    Pending = 3,
    Confirmed = 4,
    Rejected = 5
}
