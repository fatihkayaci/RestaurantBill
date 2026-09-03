using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;

public class Payment : BaseEntity
{
    public Guid OrderId { get; private set; }
    public Order Order { get; private set; } = default!;
    public Guid CashRegisterId { get; private set; }
    public CashRegister CashRegister { get; private set; } = default!;

    public decimal TotalAmount { get; private set; }
    public decimal Matrah { get; private set; }
    public decimal TaxAmount { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public int ItemCount { get; private set; }
    public decimal DiscountAmount { get; private set; }
    public decimal? DiscountPercent { get; private set; }
    public string DiscountNote { get; private set; } = string.Empty;

    protected Payment() { }

    public static Payment Create(Guid orderId, Guid cashRegisterId, decimal totalAmount, decimal matrah, decimal taxAmount, PaymentMethod paymentMethod, int itemCount,
        decimal discountAmount = 0m, decimal? discountPercent = null, string? discountNote = null)
    {
        if (orderId == Guid.Empty)
            throw new DomainException("Geçersiz sipariş.");

        if (cashRegisterId == Guid.Empty)
            throw new DomainException("Geçersiz kasa.");

        if (totalAmount < 0)
            throw new DomainException("Toplam tutar negatif olamaz.");

        if (itemCount < 0)
            throw new DomainException("Ürün sayısı negatif olamaz.");

        if (discountAmount < 0)
            throw new DomainException("İskonto tutarı negatif olamaz.");

        if (discountPercent is < 0 or > 100)
            throw new DomainException("İskonto yüzdesi 0-100 arasında olmalı.");

        return new Payment
        {
            OrderId = orderId,
            CashRegisterId = cashRegisterId,
            TotalAmount = totalAmount,
            Matrah = matrah,
            TaxAmount = taxAmount,
            PaymentMethod = paymentMethod,
            ItemCount = itemCount,
            DiscountAmount = discountAmount,
            DiscountPercent = discountPercent,
            DiscountNote = discountNote ?? string.Empty
        };
    }
}
