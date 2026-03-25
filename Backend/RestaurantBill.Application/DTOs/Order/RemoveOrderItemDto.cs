namespace RestaurantBill.Application.DTOs
{
    public class RemoveOrderItemDto
    {
        public int ProductId { get; set; }
        public int QuantityToRemove { get; set; }
    }
}