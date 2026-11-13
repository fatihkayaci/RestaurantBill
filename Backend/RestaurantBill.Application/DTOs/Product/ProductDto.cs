namespace RestaurantBill.Application.DTOs;
public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public Guid CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public int? PrepMinutes { get; set; }
    /// <summary>Ürüne özel KDV; null ise kategori oranı geçerli.</summary>
    public decimal? TaxRate { get; set; }
    /// <summary>Siparişe yazılacak oran: ürün ?? kategori ?? şube.</summary>
    public decimal EffectiveTaxRate { get; set; }
}
