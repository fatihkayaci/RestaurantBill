namespace RestaurantBill.Domain.Enums;

/// <summary>Hesap isteyen müşterinin nasıl ödeyeceği (kasaya ve garsona ön bilgi; ödeme yöntemini bağlamaz).</summary>
public enum BillPaymentHint
{
    Cash = 1,
    Card = 2,
    Iban = 3,
}
