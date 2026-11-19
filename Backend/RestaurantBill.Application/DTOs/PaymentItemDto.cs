namespace RestaurantBill.Application.DTOs;
public class PaymentItemDto
{
    public Guid OrderItemId { get; set; }
    public int Quantity { get; set; }
    /// <summary>Ürün indirimi: bu kalemin bu ödemede ödenen adetlerine (Quantity × birim fiyat) uygulanır. Yüzde ya da tutar, ikisi birden değil.</summary>
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    /// <summary>İndirimin uygulanacağı adet (1..Quantity). Boşsa ödenen adetlerin tamamı. Tutar indirimi bu adetlerin toplamıdır.</summary>
    public int? DiscountQuantity { get; set; }
}
