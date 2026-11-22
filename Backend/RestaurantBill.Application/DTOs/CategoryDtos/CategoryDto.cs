namespace RestaurantBill.Application.DTOs;
public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? TaxRate { get; set; }
    public decimal EffectiveTaxRate { get; set; }
    /// <summary>Müşteri menüsündeki görünüm: 0 otomatik, 1 kart, 2 liste.</summary>
    public RestaurantBill.Domain.Enums.CategoryMenuDisplay MenuDisplay { get; set; }
    /// <summary>Servis penceresi: gün maskesi (bit 0 = Pazar); null: her gün.</summary>
    public int? AvailableDays { get; set; }
    /// <summary>"HH:mm" ya da null.</summary>
    public string? AvailableFrom { get; set; }
    public string? AvailableUntil { get; set; }
    /// <summary>Şubenin yerel saatine göre şu an pencerenin içinde mi (pencere yoksa true). Garson/kasa uyarısı için.</summary>
    public bool AvailableNow { get; set; } = true;
    /// <summary>"12:00'ye kadar", "Hafta içi 08:00–12:00"; pencere yoksa boş.</summary>
    public string AvailabilityLabel { get; set; } = string.Empty;
}
