using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class OrderItem : BaseEntity
    {
        public decimal UnitPrice { get; private set; }
        public int Quantity { get; private set; }
        public int ProductId { get; private set; }
        public Product? Product { get; internal set; }
        public OrderItemStatus Status { get; private set; } = OrderItemStatus.Pending;
        public int OrderId { get; private set; }

        protected OrderItem() { }

        internal static OrderItem Create(int productId, decimal unitPrice, int quantity, Product product)
        {
            if (productId <= 0)
                throw new DomainException("Geçersiz ürün ID'si.");

            if (unitPrice < 0)
                throw new DomainException("Birim fiyat negatif olamaz.");

            if (quantity < 0)
                throw new DomainException("Miktar negatif olamaz.");

            return new OrderItem
            {
                ProductId = productId,
                UnitPrice = unitPrice,
                Quantity = quantity,
                Product = product,
                Status = OrderItemStatus.Pending
            };
        }

        internal void AddQuantity(int quantity)
        {
            Quantity += quantity;
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
