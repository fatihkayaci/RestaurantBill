using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities;

public class CashTransaction : BaseEntity
{
    public CashTransactionType Type { get; private set; }
    public decimal Amount { get; private set; }
    public string UserId { get; private set; } = string.Empty;
    public int CashRegisterId { get; private set; }
    public CashRegister CashRegister { get; private set; } = default!;

    protected CashTransaction() { }

    internal static CashTransaction Create(int cashRegisterId, CashTransactionType type, decimal amount, string userId)
    {
        return new CashTransaction
        {
            CashRegisterId = cashRegisterId,
            Type = type,
            Amount = amount,
            UserId = userId
        };
    }
}
