namespace RestaurantBill.Infrastructure.Messaging.Models
{
    public class KitchenOrderMessage
    {
        public int OrderId { get; set; }
        public int TableId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}