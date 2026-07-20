using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities;

public class CashTransaction : BaseEntity
{
    public CashTransactionType Type { get; private set; }
    public decimal Amount { get; private set; }
    public int UserId { get; private set; }
    public int CashRegisterId { get; private set; }
    public CashRegister CashRegister { get; private set; } = default!;
    public int? RelatedCashRegisterId { get; private set; }

    protected CashTransaction() { }

    internal static CashTransaction Create(int cashRegisterId, CashTransactionType type, decimal amount, int userId, int? relatedCashRegisterId = null)
    {
        return new CashTransaction
        {
            CashRegisterId = cashRegisterId,
            Type = type,
            Amount = amount,
            UserId = userId,
            RelatedCashRegisterId = relatedCashRegisterId
        };
    }
}
