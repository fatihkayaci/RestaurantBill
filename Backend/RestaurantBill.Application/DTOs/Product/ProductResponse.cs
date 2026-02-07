namespace RestaurantBill.Core.DTOs;
public class ProductResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public string CategoryName { get; set; } = string.Empty;
}
