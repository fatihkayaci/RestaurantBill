namespace RestaurantBill.Application.DTOs;

/// <summary>Açık günü (vardiyası) olan kasa: garson ödemeyi hangi kasaya yazacağını buradan seçer.</summary>
public class OpenRegisterDto
{
    public Guid CashRegisterId { get; set; }
    public string CashRegisterName { get; set; } = string.Empty;
    public Guid ShiftId { get; set; }
    public DateTime OpenedAt { get; set; }
    /// <summary>Günün sahibi (vardiyayı açan / atanan kişi).</summary>
    public string ShiftOwnerName { get; set; } = string.Empty;
}
