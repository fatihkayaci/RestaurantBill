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

    public void EnsureCanBeDeleted()
    {
        if (Balance > 0)
            throw new DomainException("Bu kasada bakiye bulunmaktadır. Lütfen silmeden önce bakiyeyi sıfırlayın.");
    }

    public CashTransaction AddTransaction(CashTransactionType type, decimal amount, int userId, int? relatedCashRegisterId = null)
    {
        if (Status != CashRegisterStatus.Open)
            throw new DomainException("Kapalı bir kasaya işlem eklenemez.");

        bool isOutgoing = type is CashTransactionType.Out or CashTransactionType.TransferOut;

        if (isOutgoing && Balance < amount)
            throw new DomainException("Kasa bakiyesi bu çıkışı karşılamak için yetersiz.");

        Balance += isOutgoing ? -amount : amount;

        return CashTransaction.Create(Id, type, amount, userId, relatedCashRegisterId);
    }

    public static (CashTransaction SourceTransaction, CashTransaction DestinationTransaction) Transfer(
        CashRegister source, CashRegister destination, decimal amount, int userId)
    {
        if (source.Id == destination.Id)
            throw new DomainException("Aynı kasaya aktarım yapılamaz.");

        CashTransaction sourceTransaction = source.AddTransaction(CashTransactionType.TransferOut, amount, userId, destination.Id);
        CashTransaction destinationTransaction = destination.AddTransaction(CashTransactionType.TransferIn, amount, userId, source.Id);

        return (sourceTransaction, destinationTransaction);
    }
}
