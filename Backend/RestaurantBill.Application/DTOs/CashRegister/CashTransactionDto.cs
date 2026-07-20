using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class CashTransactionDto
{
    public int Id { get; set; }
    public int CashRegisterId { get; set; }
    public CashTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public int UserId { get; set; }
    public int? RelatedCashRegisterId { get; set; }
    public DateTime CreatedAt { get; set; }
}
