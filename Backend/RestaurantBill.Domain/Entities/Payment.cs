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

    public Guid? UserId { get; private set; }
    public Guid? ShiftId { get; private set; }

    // Bir ödeme işlemi KDV oranı başına bir satır yazar; satırın oranı.
    public decimal TaxRate { get; private set; }
    // "Tutar gir" ile alınan, ürüne bağlı olmayan ödeme (satır kalemi yok). Kapanış ödemesi ürünleri taşır.
    public bool IsOnAccount { get; private set; }
    // Kapanış ödemesinde bu satırın ürünlerine, daha önce hesaba alınan ödemelerden düşülen pay.
    // Ürün raporu ciroyu satır kalemlerinden hesaplar: brüt = TotalAmount + DiscountAmount + PrepaidAmount.
    public decimal PrepaidAmount { get; private set; }

    protected Payment() { }

    public static Payment Create(Guid orderId, Guid cashRegisterId, decimal totalAmount, decimal matrah, decimal taxAmount, PaymentMethod paymentMethod, int itemCount,
        decimal discountAmount = 0m, decimal? discountPercent = null, string? discountNote = null, Guid? userId = null, Guid? shiftId = null,
        decimal taxRate = 0m, bool isOnAccount = false, decimal prepaidAmount = 0m)
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

        if (taxRate < 0)
            throw new DomainException("KDV oranı negatif olamaz.");

        if (prepaidAmount < 0)
            throw new DomainException("Önceden ödenen tutar negatif olamaz.");

        if (isOnAccount && (itemCount > 0 || discountAmount > 0 || prepaidAmount > 0 || totalAmount <= 0))
            throw new DomainException("Hesaba ödeme ürün, indirim içermez ve tutarı 0'dan büyük olmalı.");

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
            DiscountNote = discountNote ?? string.Empty,
            UserId = userId,
            ShiftId = shiftId,
            TaxRate = taxRate,
            IsOnAccount = isOnAccount,
            PrepaidAmount = prepaidAmount
        };
    }

    // Masa birleştirmede kaynak siparişe hesaba alınmış ödemeler, birleşen siparişe taşınır ki
    // kapanışta mahsup edilsin. Tutar, kasa ve vardiya değişmez; yalnızca hangi hesaba ait olduğu.
    public void MoveToOrder(Guid orderId)
    {
        if (!IsOnAccount)
            throw new DomainException("Yalnızca hesaba alınmış ödemeler başka siparişe taşınabilir.");

        if (orderId == Guid.Empty)
            throw new DomainException("Geçersiz sipariş.");

        OrderId = orderId;
    }
}
