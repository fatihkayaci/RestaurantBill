using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class OrderItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public required string ProductName { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public OrderItemStatus Status { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal TaxRate { get; set; }
    public string Note { get; set; } = string.Empty;
}
