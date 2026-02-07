namespace RestaurantBill.Core.DTOs;

public class UpdateTableDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public int Status { get; set; }
    public int UserId { get; set; }
}
