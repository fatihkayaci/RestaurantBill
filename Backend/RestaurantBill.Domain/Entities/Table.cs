namespace RestaurantBill.Core;


public class Table
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public TableStatus Status { get; set; } = TableStatus.Available;

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
