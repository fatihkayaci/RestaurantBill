namespace RestaurantBill.Domain;
public class Order : BaseEntity
{
    public string TableNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public decimal TotalPrice { get; set; }
    
    //RelationShip
    public virtual ICollection<OrderItem> OrderItems { get; set; }
}