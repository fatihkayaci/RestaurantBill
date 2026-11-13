namespace RestaurantBill.Domain.Enums;
public enum PaymentMethod
{
    Kart = 1,
    Nakit = 2,
    Qr = 3,
    // Müşteri havale/EFT yapar; kasaya nakit girmez (kart gibi).
    Iban = 4
}
