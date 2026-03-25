namespace RestaurantBill.Application.DTOs;
public class CreateOrderDto
{
    public string Note { get; set; } = string.Empty;
    public int TableId { get; set; }

}
