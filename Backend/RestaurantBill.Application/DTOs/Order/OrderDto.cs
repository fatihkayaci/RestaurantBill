using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class OrderDto
{
    public Guid Id { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public decimal TotalPrice { get; set; }
    /// <summary>Tutar girerek (ürün seçmeden) alınmış, henüz kapanmamış ödemelerin toplamı.</summary>
    public decimal PaidAmount { get; set; }
    /// <summary>Masada ödenecek kalan: TotalPrice - PaidAmount.</summary>
    public decimal RemainingAmount { get; set; }
    public OrderStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    /// <summary>Garson hesabı istediyse istek anı (UTC), yoksa null.</summary>
    public DateTime? BillRequestedAt { get; set; }
    public ICollection<OrderItemDto> OrderItems { get; set; } = new List<OrderItemDto>();
}
