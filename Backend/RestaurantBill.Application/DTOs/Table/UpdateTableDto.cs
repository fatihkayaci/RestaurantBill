using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class UpdateTableDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public TableStatus Status { get; set; }
}
