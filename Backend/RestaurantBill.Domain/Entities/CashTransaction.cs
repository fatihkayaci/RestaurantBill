
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities;
public class CashTransaction : BaseEntity
{
    public CashTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int CashRegisterId { get; set; }
    public CashRegister CashRegister { get; set; } = default!;

}