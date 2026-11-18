namespace RestaurantBill.Application.DTOs;

// Live notification for things customers do on the public site that staff should notice right away: a new
// reservation request, a guest cancelling, a reservation pre-order, a contact message. Staff lists still refresh
// through "CustomerRequestsChanged"; this event only drives the toast and sound.
public class CustomerActivityDto
{
    public const string ReservationRequested = "reservationRequested";
    public const string ReservationCancelled = "reservationCancelled";
    public const string PreOrderPlaced = "preOrderPlaced";
    public const string PreOrderUpdated = "preOrderUpdated";
    public const string ContactMessage = "contactMessage";

    public string Kind { get; set; } = string.Empty;
    // Set for reservation events; the table's waiters receive those as well. Null for contact messages.
    public Guid? TableId { get; set; }
    public string? TableName { get; set; }
    public Guid? RegionId { get; set; }
    public string? GuestName { get; set; }
    public int? PartySize { get; set; }
    // Branch-local date (yyyy-MM-dd) and time (HH:mm) of the reservation.
    public string? Date { get; set; }
    public string? Time { get; set; }
    public DateTime OccurredAt { get; set; }
}
