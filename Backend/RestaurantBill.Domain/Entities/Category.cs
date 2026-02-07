namespace RestaurantBill.Core;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
