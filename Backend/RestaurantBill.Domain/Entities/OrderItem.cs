namespace RestaurantBill.Domain.Entities
{
    public class OrderItem : BaseEntity
    {
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public int ProductId { get; set; }
        public Product? Product { get; set; }

        //RelationShip
        public int OrderId { get; set; }
    }
}