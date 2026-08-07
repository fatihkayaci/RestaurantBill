namespace RestaurantBill.Application.DTOs;
public class PaymentItemDto
{
    public Guid OrderItemId { get; set; }
    public int Quantity { get; set; }
}
