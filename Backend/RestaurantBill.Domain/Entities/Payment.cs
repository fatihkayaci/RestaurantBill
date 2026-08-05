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

    protected Payment() { }

    public static Payment Create(Guid orderId, Guid cashRegisterId, decimal totalAmount, decimal matrah, decimal taxAmount, PaymentMethod paymentMethod)
    {
        if (orderId == Guid.Empty)
            throw new DomainException("Geçersiz sipariş.");

        if (cashRegisterId == Guid.Empty)
            throw new DomainException("Geçersiz kasa.");

        if (totalAmount < 0)
            throw new DomainException("Toplam tutar negatif olamaz.");

        return new Payment
        {
            OrderId = orderId,
            CashRegisterId = cashRegisterId,
            TotalAmount = totalAmount,
            Matrah = matrah,
            TaxAmount = taxAmount,
            PaymentMethod = paymentMethod
        };
    }
}
