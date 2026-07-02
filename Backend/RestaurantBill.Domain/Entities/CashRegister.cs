using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;

public class CashRegister : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public decimal Balance { get; private set; }
    public CashRegisterStatus Status { get; private set; }
    public int RestaurantId { get; private set; }
    public Restaurant Restaurant { get; private set; } = default!;

    protected CashRegister() { }

    public static CashRegister Create(string name, decimal openingBalance, CashRegisterStatus status, int restaurantId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kasa adı boş olamaz.");

        if (openingBalance < 0)
            throw new DomainException("Açılış bakiyesi negatif olamaz.");

        if (restaurantId <= 0)
            throw new DomainException("Geçersiz restoran ID'si.");

        return new CashRegister
        {
            Name = name,
            Balance = openingBalance,
            Status = status,
            RestaurantId = restaurantId
        };
    }

    public void Update(string name, decimal balance, CashRegisterStatus status)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kasa adı boş olamaz.");

        if (balance < 0)
            throw new DomainException("Bakiye negatif olamaz.");

        Name = name;
        Balance = balance;
        Status = status;
    }

    public CashTransaction AddTransaction(CashTransactionType type, decimal amount, int userId)
    {
        if (Status != CashRegisterStatus.Open)
            throw new DomainException("Kapalı bir kasaya işlem eklenemez.");

        if (type == CashTransactionType.Out && Balance < amount)
            throw new DomainException("Kasa bakiyesi bu çıkışı karşılamak için yetersiz.");

        Balance += type == CashTransactionType.In ? amount : -amount;

        return CashTransaction.Create(Id, type, amount, userId);
    }

    public class CashTransaction : BaseEntity
    {
        public CashTransactionType Type { get; private set; }
        public decimal Amount { get; private set; }
        public int UserId { get; private set; }
        public int CashRegisterId { get; private set; }
        public CashRegister CashRegister { get; private set; } = default!;

        protected CashTransaction() { }

        internal static CashTransaction Create(int cashRegisterId, CashTransactionType type, decimal amount, int userId)
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
}
