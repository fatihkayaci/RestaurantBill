using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class CashTransactionDto
{
    public Guid Id { get; set; }
    public Guid CashRegisterId { get; set; }
    public CashTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public Guid UserId { get; set; }
    public Guid? RelatedCashRegisterId { get; set; }
    public DateTime CreatedAt { get; set; }
}
