using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    // Müşterinin masadaki QR'dan gönderdiği sipariş talebi. Personel onaylayınca masanın siparişine eklenir.
    public class OrderRequest : BaseEntity
    {
        public const int MaxItems = 50;
        public const int MaxQuantity = 50;

        public Guid TableId { get; private set; }
        public Table Table { get; private set; } = default!;
        public string Note { get; private set; } = string.Empty;
        public OrderRequestStatus Status { get; private set; } = OrderRequestStatus.Pending;

        private readonly List<OrderRequestItem> _items = new();
        public IReadOnlyCollection<OrderRequestItem> Items => _items.AsReadOnly();

        protected OrderRequest() { }

        public static OrderRequest Create(Guid tableId, string? note)
        {
            if (tableId == Guid.Empty)
                throw new DomainException("Geçersiz masa.");

            return new OrderRequest
            {
                TableId = tableId,
                Note = note?.Trim() ?? string.Empty,
                Status = OrderRequestStatus.Pending
            };
        }

        public void AddItem(Product product, int quantity, string? note)
        {
            if (product is null)
                throw new DomainException("Geçersiz ürün.");
            if (quantity <= 0 || quantity > MaxQuantity)
                throw new DomainException($"Adet 1 ile {MaxQuantity} arasında olmalı.");
            if (_items.Count >= MaxItems)
                throw new DomainException($"Bir talepte en fazla {MaxItems} kalem olabilir.");

            _items.Add(OrderRequestItem.Create(product, quantity, note?.Trim() ?? string.Empty));
        }

        public void Approve()
        {
            EnsurePending();
            Status = OrderRequestStatus.Approved;
        }

        public void Reject()
        {
            EnsurePending();
            Status = OrderRequestStatus.Rejected;
        }

        private void EnsurePending()
        {
            if (Status != OrderRequestStatus.Pending)
                throw new DomainException("Bu talep zaten işlendi.");
        }
    }

    public class OrderRequestItem : BaseEntity
    {
        public Guid OrderRequestId { get; private set; }
        public OrderRequest OrderRequest { get; private set; } = default!;
        public Guid ProductId { get; private set; }
        public Product Product { get; private set; } = default!;
        public int Quantity { get; private set; }
        public string Note { get; private set; } = string.Empty;

        protected OrderRequestItem() { }

        internal static OrderRequestItem Create(Product product, int quantity, string note)
        {
            return new OrderRequestItem
            {
                Product = product,
                ProductId = product.Id,
                Quantity = quantity,
                Note = note
            };
        }
    }
}
