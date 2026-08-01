using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class OrderDto
{
    public Guid Id { get; set; }
    public Guid TableId { get; set; }
    public string Note { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
    public OrderStatus Status { get; set; }
    public ICollection<OrderItemDto> OrderItems { get; set; } = new List<OrderItemDto>();
}
