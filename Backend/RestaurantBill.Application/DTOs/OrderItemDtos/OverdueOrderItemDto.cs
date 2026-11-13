namespace RestaurantBill.Application.DTOs;

// Hazırlanma süresini aşmış, hâlâ hazır olmayan sipariş kalemi. Hem canlı uyarı (SignalR)
// hem de Genel Bakış'taki "Geciken siparişler" kartı bu şekli kullanır.
public class OverdueOrderItemDto
{
    public Guid OrderItemId { get; set; }
    public Guid OrderId { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int PrepMinutes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime DueAt { get; set; }
}
