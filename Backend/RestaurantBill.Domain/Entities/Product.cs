namespace RestaurantBill.Domain.Entities
{
    public class Product : BaseEntity
    {
        public required string Name { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public string ImageUrl { get; set; } = string.Empty;

        //RelationShip
        public int CategoryId { get; set; }
        public Category Category { get; set; } = default!;
    }
}