namespace RestaurantBill.Infrastructure.DTOs.Order;

public class UpdateOrderDto
{
    public int Id { get; set; }
    public int Status { get; set; }
    public int TableId { get; set; }
}
