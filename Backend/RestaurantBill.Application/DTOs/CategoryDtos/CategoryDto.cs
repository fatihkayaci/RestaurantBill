namespace RestaurantBill.Application.DTOs;
public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? TaxRate { get; set; }
    public decimal EffectiveTaxRate { get; set; }
}
