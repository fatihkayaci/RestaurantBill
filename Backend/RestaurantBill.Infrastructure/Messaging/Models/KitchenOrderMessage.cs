namespace RestaurantBill.Infrastructure.Messaging.Models
{
    public class KitchenOrderMessage
    {
        public int Id { get; set; }
        public int TableId { get; set; }
        public string Note { get; set; } = string.Empty;
        public decimal TotalPrice { get; set; }
        public int Status { get; set; }
        public List<KitchenOrderItemMessage> OrderItems { get; set; } = [];
    }

    public class KitchenOrderItemMessage
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public int Status { get; set; }
    }
}
