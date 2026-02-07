namespace RestaurantBill.Core.DTOs;
public class CreateProductDto
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public int CategoryId { get; set; }
}
