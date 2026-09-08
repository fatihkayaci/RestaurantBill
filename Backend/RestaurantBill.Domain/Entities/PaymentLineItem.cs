using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;

/// <summary>
/// Bir ödeme anında satılan tek bir ürün kalemi. OrderItem, kalem tamamen ödendiğinde
/// Order'ın koleksiyonundan kaldırılır ve (zorunlu FK olduğu için) veritabanından silinir —
/// bu yüzden ürün bazlı raporlar için kalıcı, ödeme anında dondurulmuş bir kayıt burada tutulur.
/// Ürün/kategori adı anlık görüntü (snapshot) olarak saklanır ki ürün sonradan yeniden
/// adlandırılsa veya silinse bile geçmiş raporlar değişmesin.
/// </summary>
public class PaymentLineItem : BaseEntity
{
    public Guid PaymentId { get; private set; }
    public Payment Payment { get; private set; } = default!;

    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public Guid CategoryId { get; private set; }
    public string CategoryName { get; private set; } = string.Empty;
    public decimal UnitPrice { get; private set; }
    public int Quantity { get; private set; }
    public decimal TaxRate { get; private set; }

    protected PaymentLineItem() { }

    public static PaymentLineItem Create(Payment payment, Guid productId, string productName, Guid categoryId, string categoryName, decimal unitPrice, int quantity, decimal taxRate)
    {
        if (payment is null)
            throw new DomainException("Geçersiz ödeme.");

        if (productId == Guid.Empty)
            throw new DomainException("Geçersiz ürün.");

        if (unitPrice < 0)
            throw new DomainException("Birim fiyat negatif olamaz.");

        if (quantity <= 0)
            throw new DomainException("Miktar 0'dan büyük olmalı.");

        return new PaymentLineItem
        {
            Payment = payment,
            ProductId = productId,
            ProductName = productName,
            CategoryId = categoryId,
            CategoryName = categoryName,
            UnitPrice = unitPrice,
            Quantity = quantity,
            TaxRate = taxRate
        };
    }
}
