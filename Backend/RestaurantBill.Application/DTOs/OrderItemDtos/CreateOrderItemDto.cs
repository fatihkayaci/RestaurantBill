namespace RestaurantBill.Application.DTOs;
public class CreateOrderItemDto
{
    public int Quantity { get; set; }
    public Guid ProductId { get; set; }
}
