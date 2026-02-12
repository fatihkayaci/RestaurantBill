namespace RestaurantBill.Domain.Entities
{
    public class Product : BaseEntity
    {
        public required string Name { get; set; }
        public decimal Price { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public int CategoryId { get; set; }
    }
}