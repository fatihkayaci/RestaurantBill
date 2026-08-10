using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class ShiftTransactionDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public decimal TaxAmount { get; set; }
    public int ItemCount { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string CreatedByUserName { get; set; } = string.Empty;
    public List<ShiftTransactionDetailDto> Details { get; set; } = new();
}

public class ShiftTransactionDetailDto
{
    public DateTime CreatedAt { get; set; }
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public decimal TaxAmount { get; set; }
    public int ItemCount { get; set; }
}
