namespace RestaurantBill.Application.DTOs;

public class ShiftStartCandidateDto
{
    public Guid CashRegisterId { get; set; }
    public string CashRegisterName { get; set; } = string.Empty;
    // Kasiyere gönderilmez (kör sayım); sadece Admin/Owner görür.
    public decimal? ExpectedOpeningBalance { get; set; }
    public bool HasOpenShift { get; set; }
    public Guid? OpenShiftId { get; set; }
    public DateTime? OpenedAt { get; set; }
    public string? OpenShiftOwnerName { get; set; }
    public bool IsMine { get; set; }
    // Kasanın son vardiyası sayılmadan kapandıysa yeni vardiya açılışta sayım ister.
    public bool RequiresCount { get; set; }
}
