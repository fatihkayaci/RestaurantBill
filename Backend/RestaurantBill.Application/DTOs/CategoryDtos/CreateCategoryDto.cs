namespace RestaurantBill.Core.DTOs;

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
