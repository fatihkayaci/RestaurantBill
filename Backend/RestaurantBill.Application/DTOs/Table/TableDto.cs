using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class TableDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    /// <summary>En fazla kaç kişi (rezervasyonda gösterilir); girilmemişse null.</summary>
    public int? Capacity { get; set; }
    /// <summary>Bölge içindeki sıra (küçük önce); liste zaten bu sırayla gelir.</summary>
    public int SortOrder { get; set; }
    public TableStatus Status { get; set; }
    public decimal ActiveOrderTotal { get; set; }
    /// <summary>Açık siparişten tutar girerek alınmış ödemeler.</summary>
    public decimal PaidAmount { get; set; }
    /// <summary>Açık siparişte ödenecek kalan (ActiveOrderTotal - PaidAmount).</summary>
    public decimal RemainingAmount { get; set; }
    public DateTime? OccupiedSince { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    /// <summary>Açık siparişte hesap istendiyse istek anı (UTC).</summary>
    public DateTime? BillRequestedAt { get; set; }
    /// <summary>Açık siparişte hazırlanma süresini aşmış (bekleyen/hazırlanan) kalem sayısı.</summary>
    public int OverdueItemCount { get; set; }
    public Guid RegionId { get; set; }
    public string RegionName { get; set; } = string.Empty;
}
