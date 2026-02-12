using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Domain.Entities
{
    public class Table : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public TableStatus Status { get; set; } = TableStatus.Available;
        public int RestaurantId { get; set; }
    }
}