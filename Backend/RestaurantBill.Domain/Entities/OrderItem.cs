using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class OrderItem : BaseEntity
    {
        public Guid ProductId { get; private set; }
        public Product Product { get; internal set; } = default!;
        public Guid OrderId { get; private set; }
        public Order Order { get; private set; } = default!;

        public decimal UnitPrice { get; private set; }
        public int Quantity { get; private set; }
        public decimal TaxRate { get; private set; }
        public OrderItemStatus Status { get; private set; } = OrderItemStatus.Pending;


        protected OrderItem() { }

        internal static OrderItem Create(decimal unitPrice, int quantity, Product product, decimal taxRate)
        {
            if (product == null)
                throw new DomainException("Geçersiz ürün ID'si.");

            if (unitPrice < 0)
                throw new DomainException("Birim fiyat negatif olamaz.");

            if (quantity < 0)
                throw new DomainException("Miktar negatif olamaz.");

            return new OrderItem
            {
                Product = product,
                ProductId = product.Id,
                UnitPrice = unitPrice,
                Quantity = quantity,
                TaxRate = taxRate,
                Status = OrderItemStatus.Pending
            };
        }

        internal void AddQuantity(int quantity)
        {
            Quantity += quantity;
        }

        internal void ReduceQuantity(int quantity)
        {
            Quantity -= quantity;
        }

        public void UpdateQuantity(int quantity)
        {
            if (Status != OrderItemStatus.Pending)
                throw new DomainException("Sadece beklemedeki ürünlerin miktarı güncellenebilir.");

            if (quantity <= 0)
                throw new DomainException("Miktar 0'dan büyük olmalı.");

            Quantity = quantity;
        }

        public void UpdateStatus(OrderItemStatus status)
        {
            Status = status;
        }
    }
}
