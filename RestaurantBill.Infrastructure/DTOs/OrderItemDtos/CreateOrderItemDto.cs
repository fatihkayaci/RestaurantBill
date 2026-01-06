namespace RestaurantBill.Infrastructure.DTOs.OrderItemDtos;

public class CreateOrderItemDto
{
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}
