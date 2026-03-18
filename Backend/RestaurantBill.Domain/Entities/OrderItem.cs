using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities
{
    public class OrderItem : BaseEntity
    {
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public int ProductId { get; set; }
        public Product? Product { get; set; }
        public OrderItemStatus Status { get; set; } = OrderItemStatus.Pending;
        //RelationShip
        public int OrderId { get; set; }
    }
}