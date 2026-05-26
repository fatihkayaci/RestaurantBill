using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;

public class CashRegister : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public decimal Balance { get; private set; }
    public CashRegisterStatus Status { get; private set; }
    public int RestaurantId { get; private set; }

    protected CashRegister() { }

    public static CashRegister Create(string name, decimal openingBalance, CashRegisterStatus status, int restaurantId)
    {
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
        Name = name;
        Balance = balance;
        Status = status;
    }

    public CashTransaction AddTransaction(CashTransactionType type, decimal amount, string userId)
    {
        if (Status != CashRegisterStatus.Open)
            throw new DomainException("Kapalı bir kasaya işlem eklenemez.");

        if (type == CashTransactionType.Out && Balance < amount)
            throw new DomainException("Kasa bakiyesi bu çıkışı karşılamak için yetersiz.");

        Balance += type == CashTransactionType.In ? amount : -amount;

        return CashTransaction.Create(Id, type, amount, userId);
    }
}
