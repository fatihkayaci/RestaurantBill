namespace RestaurantBill.Core.DTOs;

public class CreateTableDto
{
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public int Status { get; set; }
    public int UserId { get; set; }
}
