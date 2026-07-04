using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class TableDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public TableStatus Status { get; set; }
    public decimal ActiveOrderTotal { get; set; }
    public DateTime? OccupiedSince { get; set; }
}
