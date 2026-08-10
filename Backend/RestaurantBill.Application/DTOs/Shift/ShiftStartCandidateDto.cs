namespace RestaurantBill.Application.DTOs;

public class ShiftStartCandidateDto
{
    public Guid CashRegisterId { get; set; }
    public string CashRegisterName { get; set; } = string.Empty;
    public decimal ExpectedOpeningBalance { get; set; }
}
