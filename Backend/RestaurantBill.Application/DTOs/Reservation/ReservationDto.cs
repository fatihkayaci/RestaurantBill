namespace RestaurantBill.Application.DTOs;

public class ReservationDto
{
    public int Id { get; set; }
    public int TableId { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public DateTime ReservationTime { get; set; }
    public string Note { get; set; } = string.Empty;
}
