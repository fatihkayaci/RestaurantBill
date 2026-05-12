namespace RestaurantBill.Domain.Entities
{
    public class Product : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public bool IsActive { get; set; }
        public string ImageUrl { get; set; } = string.Empty;

        //RelationShip
        public int RestaurantId { get; set; }
        public int CategoryId { get; set; }
        public Category Category { get; set; } = default!;
    }
}