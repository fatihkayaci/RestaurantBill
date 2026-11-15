using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs.ContactMessages;

// Admin "Şikayet ve Öneriler" listesindeki bir mesaj.
public class ContactMessageDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public ContactMessageType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ContactMessageUnreadCountDto
{
    public int Count { get; set; }
}
