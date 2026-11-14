namespace RestaurantBill.Application.DTOs;

// Mutfak ürünleri pasaya (Hazır) koyduğunda garsonlara giden canlı bildirim: "Masa 1 – 2× Adana Kebap hazır".
// Bir istekte hazır olan tüm ürünler tek bildirimde gelir.
public class ItemsReadyDto
{
    public Guid OrderId { get; set; }
    /// <summary>Paket siparişte Guid.Empty (masa yok); TableName "PAKET #123 · Moda" olur.</summary>
    public Guid TableId { get; set; }
    /// <summary>Paket siparişin numarası; masa siparişinde null.</summary>
    public int? DeliveryNumber { get; set; }
    public string TableName { get; set; } = string.Empty;
    public Guid RegionId { get; set; }
    public List<ReadyOrderItemDto> Items { get; set; } = [];
    public DateTime ReadyAt { get; set; }
}

public class ReadyOrderItemDto
{
    public Guid OrderItemId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Note { get; set; }
}
