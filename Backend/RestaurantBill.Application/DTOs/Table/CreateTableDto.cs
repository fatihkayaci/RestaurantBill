using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class CreateTableDto
{
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public TableStatus Status { get; set; } = TableStatus.Available;
}
