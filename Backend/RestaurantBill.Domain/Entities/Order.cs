using RestaurantBill.Domain.Enums;
namespace RestaurantBill.Domain.Entities
{
    public class Order : BaseEntity
    {
        public string Note { get; set; } = string.Empty;
        public decimal TotalPrice { get; set; }
        public OrderStatus Status { get; set; }
        public int TableId { get; set; }
        public Table Table { get; set; } = default!;
        public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    }
}