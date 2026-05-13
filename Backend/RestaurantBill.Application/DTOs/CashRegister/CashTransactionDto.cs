using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class CashTransactionDto
{
    public int Id { get; set; }
    public int CashRegisterId { get; set; }
    public CashTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
