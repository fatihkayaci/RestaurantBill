using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

/// <summary>
/// Set menü ("Adana Menü"). Garson ekranı ve yönetici ekranı aynı şekli kullanır; maliyet alanları yalnızca
/// Admin/Owner'a giden yanıtta doludur, diğer rollerde null.
/// </summary>
public class SetMenuDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>Satış fiyatı: ürünlerden hesaplanmış, menü indirimi düşülmüş.</summary>
    public decimal Price { get; set; }
    /// <summary>Menü indirimi öncesi fiyat (bölümlerin taban fiyatlarının toplamı).</summary>
    public decimal ListPrice { get; set; }
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    /// <summary>Shown in the public "Chef's recommendation" section.</summary>
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public List<SetMenuSlotDto> Slots { get; set; } = [];
    /// <summary>Varsayılan seçeneklerle ürün maliyetlerinin toplamı (yalnızca Admin/Owner).</summary>
    public decimal? EstimatedCost { get; set; }
}

public class SetMenuSlotDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public int SortOrder { get; set; }
    /// <summary>Tek seçenekli bölüm: sabit ürün, garson seçim yapmaz.</summary>
    public bool IsFixed { get; set; }
    public List<SetMenuSlotOptionDto> Options { get; set; } = [];
}

public class SetMenuSlotOptionDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    /// <summary>Ürünün normal (menü dışı) fiyatı.</summary>
    public decimal ProductPrice { get; set; }
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    /// <summary>Menü içindeki fiyatı: ürün fiyatı − indirim.</summary>
    public decimal Price { get; set; }
    /// <summary>Bölümün taban fiyatına göre ek ücret (fiyat farkından hesaplanır).</summary>
    public decimal Surcharge { get; set; }
    public bool IsDefault { get; set; }
    /// <summary>Ürün pasifse bu seçenek siparişte seçilemez.</summary>
    public bool IsProductActive { get; set; }
    /// <summary>Ürünün birim maliyeti (yalnızca Admin/Owner).</summary>
    public decimal? Cost { get; set; }
}
