using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class OrderDto
{
    public Guid Id { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public ICollection<OrderItemDto> OrderItems { get; set; } = new List<OrderItemDto>();
}
