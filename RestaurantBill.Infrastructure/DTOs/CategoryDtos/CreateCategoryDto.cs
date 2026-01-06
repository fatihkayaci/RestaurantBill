namespace RestaurantBill.Infrastructure.DTOs.CategoryDtos;

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
