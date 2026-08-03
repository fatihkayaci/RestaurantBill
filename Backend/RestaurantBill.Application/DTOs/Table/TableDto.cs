using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class TableDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public TableStatus Status { get; set; }
    public decimal ActiveOrderTotal { get; set; }
    public DateTime? OccupiedSince { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public Guid RegionId { get; set; }
    public string RegionName { get; set; } = string.Empty;
}
