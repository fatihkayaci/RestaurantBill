using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class OrderItem : BaseEntity
    {
        // Ürün satırında dolu; menü satırında (SetMenuId dolu) null.
        public Guid? ProductId { get; private set; }
        public Product? Product { get; internal set; }
        // Menü satırı: tek satır, tek fiyat (menü fiyatı + ek ücretler). İçindeki ürünler ayrı kalemlerdir.
        public Guid? SetMenuId { get; private set; }
        public SetMenu? SetMenu { get; private set; }
        // Menü içeriği: menü satırına bağlı, fiyatı 0 olan ürün kalemi. Mutfakta görünür, hesapta görünmez.
        public Guid? ParentOrderItemId { get; private set; }
        public OrderItem? ParentOrderItem { get; private set; }
        public Guid OrderId { get; private set; }
        public Order Order { get; private set; } = default!;

        public decimal UnitPrice { get; private set; }
        public int Quantity { get; private set; }
        public decimal TaxRate { get; private set; }
        public string Note { get; private set; } = string.Empty;
        public OrderItemStatus Status { get; private set; } = OrderItemStatus.Pending;
        // Sipariş anındaki hazırlanma süresi; ürünün süresi sonradan değişse de bu kalemin
        // hedef saati (CreatedAt + PrepMinutes) sabit kalır.
        public int? PrepMinutes { get; private set; }
        // Gecikme uyarısının gönderildiği an; her kalem için yalnızca bir kez uyarı gider.
        public DateTime? OverdueNotifiedAt { get; private set; }
        // Paket: müşteri QR'da "Paket olsun" dedi; mutfak paketler, garson masaya değil pakete koyar. Menü içeriği
        // menü satırınınkini taşır (mutfak menü satırını görmez).
        public bool IsTakeaway { get; private set; }


        public bool IsSetMenu => SetMenuId is not null;
        public bool IsSetMenuComponent => ParentOrderItemId is not null || ParentOrderItem is not null;

        protected OrderItem() { }

        internal static OrderItem Create(decimal unitPrice, int quantity, Product product, decimal taxRate, string note = "", bool isTakeaway = false)
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
                Note = note ?? string.Empty,
                Status = OrderItemStatus.Pending,
                PrepMinutes = product.PrepMinutes,
                IsTakeaway = isTakeaway
            };
        }

        internal static OrderItem CreateSetMenu(SetMenu setMenu, decimal unitPrice, int quantity, decimal taxRate, string note, bool isTakeaway = false)
        {
            if (setMenu == null)
                throw new DomainException("Geçersiz menü.");

            if (unitPrice < 0)
                throw new DomainException("Birim fiyat negatif olamaz.");

            return new OrderItem
            {
                SetMenu = setMenu,
                SetMenuId = setMenu.Id,
                UnitPrice = unitPrice,
                Quantity = quantity,
                TaxRate = taxRate,
                Note = note ?? string.Empty,
                Status = OrderItemStatus.Pending,
                IsTakeaway = isTakeaway
            };
        }

        // Fiyat menü satırındadır; içerik 0 ₺ ile yazılır ki toplam ve ödemeler iki kez saymasın.
        internal static OrderItem CreateSetMenuComponent(OrderItem parent, Product product)
        {
            if (product == null)
                throw new DomainException("Geçersiz ürün ID'si.");

            return new OrderItem
            {
                ParentOrderItem = parent,
                Product = product,
                ProductId = product.Id,
                UnitPrice = 0m,
                Quantity = parent.Quantity,
                TaxRate = parent.TaxRate,
                Status = OrderItemStatus.Pending,
                PrepMinutes = product.PrepMinutes,
                IsTakeaway = parent.IsTakeaway
            };
        }

        internal void AddQuantity(int quantity)
        {
            Quantity += quantity;
        }

        internal void ReassignOrder(Order newOrder)
        {
            OrderId = newOrder.Id;
            Order = newOrder;
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

        /// <summary>Hazırlanma süresi varsa hedef hazır olma anı (UTC).</summary>
        public DateTime? GetDueAt()
        {
            return PrepMinutes is null ? null : CreatedAt.AddMinutes(PrepMinutes.Value);
        }

        /// <summary>Süresi olan, henüz hazır olmamış ve hedef anı geçmiş kalem.</summary>
        public bool IsOverdue(DateTime utcNow)
        {
            DateTime? dueAt = GetDueAt();
            return dueAt is not null
                && Status is OrderItemStatus.Pending or OrderItemStatus.Preparing
                && utcNow >= dueAt.Value;
        }

        /// <summary>Gecikmiş ve daha önce uyarısı gitmemişse işaretler; uyarı gönderilmesi gerekiyorsa true döner.</summary>
        public bool TryMarkOverdueNotified(DateTime utcNow)
        {
            if (OverdueNotifiedAt is not null || !IsOverdue(utcNow))
                return false;

            OverdueNotifiedAt = utcNow;
            return true;
        }

        public void UpdateStatus(OrderItemStatus status)
        {
            Status = status;
        }

        internal void UpdateNote(string note)
        {
            Note = note ?? string.Empty;
        }
    }
}
