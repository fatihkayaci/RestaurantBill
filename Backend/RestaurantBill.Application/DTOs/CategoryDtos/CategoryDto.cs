namespace RestaurantBill.Application.DTOs;
public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? TaxRate { get; set; }
    public decimal EffectiveTaxRate { get; set; }
    /// <summary>Müşteri menüsündeki görünüm: 0 otomatik, 1 kart, 2 liste.</summary>
    public RestaurantBill.Domain.Enums.CategoryMenuDisplay MenuDisplay { get; set; }
}
