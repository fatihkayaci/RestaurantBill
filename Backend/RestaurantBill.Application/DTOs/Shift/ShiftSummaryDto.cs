using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class ShiftSummaryDto
{
    public Guid ShiftId { get; set; }
    public DateTime OpenedAt { get; set; }
    public int TransactionCount { get; set; }
    public List<ShiftPaymentBreakdownDto> Breakdown { get; set; } = new();
    public decimal Total { get; set; }
    public int OpenTablesCount { get; set; }
}

public class ShiftPaymentBreakdownDto
{
    public PaymentMethod Method { get; set; }
    public int Count { get; set; }
    public decimal Amount { get; set; }
}
