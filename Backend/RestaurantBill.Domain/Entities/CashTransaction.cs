
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities;
public class CashTransaction : BaseEntity
{
    public int CashRegisterId { get; set; }
    public CashTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public int UserId { get; set; }
}