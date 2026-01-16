namespace RestaurantBill.Core;
public class Order
{
    public int Id { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public decimal TotalPrice { get; set; }

    public int TableId { get; set; }
    public Table Table { get; set; } = default!;

    public int UserId { get; set; }
    public User User { get; set; } = default!;
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}