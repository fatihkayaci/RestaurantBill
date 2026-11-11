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

    // Açık vardiya yokken kartta "son vardiya dün 23:48'de sayımla kapandı" diyebilmek ve
    // sayımsız kapananlar için "Sayım gir" düğmesini bağlamak için.
    public Guid? LastClosedShiftId { get; set; }
    public DateTime? LastClosedAt { get; set; }
    public bool LastClosedBySystem { get; set; }
    public bool LastClosedCounted { get; set; }
    public string? LastShiftOwnerName { get; set; }
}
