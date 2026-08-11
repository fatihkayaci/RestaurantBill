using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class ShiftDto
{
    public Guid Id { get; set; }
    public Guid BranchId { get; set; }
    public Guid CashRegisterId { get; set; }
    public string CashRegisterName { get; set; } = string.Empty;
    public Guid OpenedByUserId { get; set; }
    public Guid? ClosedByUserId { get; set; }
    public decimal ExpectedOpeningBalance { get; set; }
    public decimal OpeningBalance { get; set; }
    public decimal OpeningDifference { get; set; }
    public DateTime? OpeningDifferenceApprovedAt { get; set; }
    public Guid? OpeningDifferenceApprovedByUserId { get; set; }
    public decimal ExpectedClosingBalance { get; set; }
    public decimal? CountedClosingBalance { get; set; }
    public decimal? Difference { get; set; }
    public DateTime? ClosingDifferenceApprovedAt { get; set; }
    public Guid? ClosingDifferenceApprovedByUserId { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public ShiftStatus Status { get; set; }
    public string? Note { get; set; }
}
