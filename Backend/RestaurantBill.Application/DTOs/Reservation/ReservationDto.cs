namespace RestaurantBill.Application.DTOs;

public class ReservationDto
{
    public Guid Id { get; set; }
    public Guid TableId { get; set; }
    /// <summary>Kısa kod, "K7M-2QP".</summary>
    public string Code { get; set; } = string.Empty;
    /// <summary>Müşterinin rezervasyon bağlantısının anahtarı (/rezervasyon/:token).</summary>
    public string AccessToken { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public DateTime ReservationTime { get; set; }
    public string Note { get; set; } = string.Empty;
}
