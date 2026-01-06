namespace RestaurantBill.Infrastructure.DTOs.Order;

public class CreateOrderDto
{
    public int Status { get; set; }
    public int TableId { get; set; }
    public int UserId { get; set; }
}
