namespace RestaurantBill.Application.DTOs.StockImages;

// Hazır görsel seçicisindeki bir fotoğraf. Url tam CDN adresidir.
public class StockImageDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Group { get; set; }
    public string Url { get; set; } = string.Empty;
}
