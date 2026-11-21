using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;

public class OrderItemDto
{
    public Guid Id { get; set; }
    /// <summary>Menü satırında boş Guid; satırın menü olduğunu SetMenuId söyler.</summary>
    public Guid ProductId { get; set; }
    /// <summary>Ürün adı; menü satırında menünün adı ("Adana Menü").</summary>
    public required string ProductName { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public OrderItemStatus Status { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal TaxRate { get; set; }
    public string Note { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    /// <summary>Sipariş anındaki hazırlanma süresi (dk); null ise geri sayım yok.</summary>
    public int? PrepMinutes { get; set; }
    /// <summary>Paket kalem: müşteri QR'da "Paket olsun" dedi (garson, kasa ve mutfak "PAKET" rozeti gösterir).</summary>
    public bool IsTakeaway { get; set; }

    /// <summary>Menü satırıysa menünün Id'si.</summary>
    public Guid? SetMenuId { get; set; }
    /// <summary>Menü satırının içindeki ürünler (hesap ekranlarında satırın altında gösterilebilir).</summary>
    public List<OrderItemDto> Components { get; set; } = [];

    /// <summary>Menü içeriğiyse bağlı olduğu menü satırı (yalnızca mutfak yanıtında üst düzeyde görünür).</summary>
    public Guid? ParentOrderItemId { get; set; }
    /// <summary>Menü içeriğinin menüsünün adı; mutfakta ürünler bu başlığın altında gruplanır.</summary>
    public string? SetMenuName { get; set; }
    /// <summary>Menü satırının notu; mutfak menü satırını görmediği için içeriğe taşınır.</summary>
    public string? SetMenuNote { get; set; }
}
