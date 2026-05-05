
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities;
public class CashRegister : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public CashRegisterStatus Status { get; set; }
    public int RestaurantId { get; set; }
}
