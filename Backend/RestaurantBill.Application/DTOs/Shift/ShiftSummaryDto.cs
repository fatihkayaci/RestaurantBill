using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class ShiftSummaryDto
{
    public Guid ShiftId { get; set; }
    public DateTime OpenedAt { get; set; }
    public int TransactionCount { get; set; }
    public List<ShiftPaymentBreakdownDto> Breakdown { get; set; } = new();
    public decimal Total { get; set; }
    // Kasiyere gönderilmez (kör sayım); sadece Admin/Owner görür.
    public decimal? ExpectedCashInRegister { get; set; }
    public int OpenTablesCount { get; set; }
    /// <summary>
    /// Kuryelerin üzerinde kalan, kasaya teslim edilmemiş tahsilat (şubenin tümü). Gün kapatılırken uyarı içindir,
    /// kapatmayı engellemez.
    /// </summary>
    public List<ShiftCourierCashDto> CouriersWithUnsettledCash { get; set; } = new();
}

public class ShiftCourierCashDto
{
    public Guid CourierUserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public decimal Cash { get; set; }
    public int CashOrderCount { get; set; }
    public decimal Card { get; set; }
    public int CardOrderCount { get; set; }
}

public class ShiftPaymentBreakdownDto
{
    public PaymentMethod Method { get; set; }
    public int Count { get; set; }
    public decimal Amount { get; set; }
}
