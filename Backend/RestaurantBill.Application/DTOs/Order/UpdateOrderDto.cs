using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class UpdateOrderDto
{
    public int Id { get; set; }
    public OrderStatus Status { get; set; }
    public int TableId { get; set; }
}
