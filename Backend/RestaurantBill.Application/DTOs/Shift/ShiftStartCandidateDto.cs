namespace RestaurantBill.Application.DTOs;

public class ShiftStartCandidateDto
{
    public Guid CashRegisterId { get; set; }
    public string CashRegisterName { get; set; } = string.Empty;
    public decimal ExpectedOpeningBalance { get; set; }
    public bool HasOpenShift { get; set; }
    public Guid? OpenShiftId { get; set; }
    public DateTime? OpenedAt { get; set; }
    public bool PreviousShiftUncounted { get; set; }
}
