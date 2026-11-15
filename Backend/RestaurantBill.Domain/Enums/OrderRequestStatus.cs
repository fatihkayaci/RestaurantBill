namespace RestaurantBill.Domain.Enums;

public enum OrderRequestStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    // Ön siparişi müşteri iptal etti ya da rezervasyon iptal/ret/gelmedi oldu.
    Cancelled = 4,
    // Ön sipariş, misafir rezervasyon saatinden sonra gelmeyince düştü.
    Expired = 5
}
