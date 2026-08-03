using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities;

public class CashTransaction : BaseEntity
{
    public Guid CashRegisterId { get; private set; }
    public CashRegister CashRegister { get; private set; } = default!;
    
    public CashTransactionType Type { get; private set; }
    public decimal Amount { get; private set; }
    public Guid UserId { get; private set; }
    public Guid? RelatedCashRegisterId { get; private set; }

    protected CashTransaction() { }

    public static CashTransaction Create(Guid cashRegisterId, CashTransactionType type, decimal amount, Guid userId, Guid? relatedCashRegisterId = null)
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
