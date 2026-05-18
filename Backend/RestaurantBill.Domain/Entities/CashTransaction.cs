using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities;

public class CashTransaction : BaseEntity
{
    public CashTransactionType Type { get; internal set; }
    public decimal Amount { get; internal set; }
    public string UserId { get; internal set; } = string.Empty;
    public int CashRegisterId { get; internal set; }
    public CashRegister CashRegister { get; private set; } = default!;
}
