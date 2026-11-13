using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Order : BaseEntity
    {
        public Guid TableId { get; private set; }
        public Table Table { get; private set; } = default!;

        public string Note { get; private set; } = string.Empty;
        public decimal TotalPrice { get; private set; }
        public OrderStatus Status { get; private set; } = OrderStatus.Active;
        // Garson "Hesap iste" dediğinde dolar; kasiyer ve yöneticiler masayı "hesap istendi" görür.
        // Sipariş ödenince ya da iptal edilince temizlenir.
        public DateTime? BillRequestedAt { get; private set; }
        // "Tutar gir" ile alınan, henüz ürünlere mahsup edilmemiş ödemelerin toplamı (hesaba ödeme).
        // Ürünler masada kalır; kalan tutar = TotalPrice - PaidOnAccount. Hesap kapanırken sıfırlanır.
        public decimal PaidOnAccount { get; private set; }
        public decimal RemainingAmount => TotalPrice - PaidOnAccount;
        private readonly List<OrderItem> _orderItems = new();
        public IReadOnlyCollection<OrderItem> OrderItems => _orderItems.AsReadOnly();

        protected Order() { }

        public static Order Create(Guid tableId)
        {
            if (tableId == Guid.Empty)
                throw new DomainException("Geçersiz masa.");

            return new Order
            {
                TableId = tableId,
                Status = OrderStatus.Active
            };
        }

        public void AddItem(Product product, int quantity, decimal taxRate = 0m, string? note = null)
        {
            if (quantity <= 0)
                throw new DomainException("Miktar 0'dan büyük olmalı.");

            string normalizedNote = note?.Trim() ?? string.Empty;

            OrderItem? existing = _orderItems.FirstOrDefault(x =>
                x.ProductId == product.Id && x.Status == OrderItemStatus.Pending && x.Note == normalizedNote);

            if (existing != null)
            {
                existing.AddQuantity(quantity);
                existing.Product = product;
            }
            else
            {
                _orderItems.Add(OrderItem.Create(product.Price, quantity, product, taxRate, normalizedNote));
            }

            RecalculateTotal();

            if (Status < OrderStatus.Preparing)
                Status = OrderStatus.Pending;
        }

        public void UpdateNote(string note)
        {
            Note = note ?? string.Empty;
        }

        public void RemoveItem(Guid productId)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.ProductId == productId);
            if (item == null)
                throw new DomainException("İptal etmek istediğiniz ürün zaten bu siparişte yok.");

            EnsureTotalCoversPaidOnAccount(TotalPrice - item.UnitPrice * item.Quantity);
            _orderItems.Remove(item);
            RecalculateTotal();
        }

        public void UpdateItemQuantity(Guid productId, int quantity)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.ProductId == productId);
            if (item == null)
                throw new DomainException("Güncellemek istediğiniz ürün bu siparişte yok.");

            if (quantity < item.Quantity)
                EnsureTotalCoversPaidOnAccount(TotalPrice - item.UnitPrice * (item.Quantity - quantity));
            item.UpdateQuantity(quantity);
            RecalculateTotal();
        }

        public void SettleItem(Guid orderItemId, int paidQuantity)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.Id == orderItemId);
            if (item == null)
                throw new DomainException("Ödenmek istenen ürün bu siparişte yok.");

            if (paidQuantity <= 0)
                throw new DomainException("Ödenen miktar 0'dan büyük olmalı.");

            if (paidQuantity > item.Quantity)
                throw new DomainException("Ödenen miktar sipariş kalemindeki miktardan fazla olamaz.");

            if (paidQuantity == item.Quantity)
                _orderItems.Remove(item);
            else
                item.ReduceQuantity(paidQuantity);

            RecalculateTotal();
        }

        // Sipariş durumu ilerlerken ürünlerin hangi durumdan hangisine geçeceği (mutfak akışı).
        private static readonly Dictionary<OrderStatus, (OrderItemStatus[] from, OrderItemStatus to)> ItemTransitions = new()
        {
            [OrderStatus.Preparing] = (new[] { OrderItemStatus.Pending }, OrderItemStatus.Preparing),
            [OrderStatus.Ready]     = (new[] { OrderItemStatus.Pending, OrderItemStatus.Preparing }, OrderItemStatus.Ready),
            [OrderStatus.Served]    = (new[] { OrderItemStatus.Ready }, OrderItemStatus.Served),
        };

        public static bool IsItemTransitionStatus(OrderStatus status) => ItemTransitions.ContainsKey(status);

        public void UpdateStatus(OrderStatus newStatus)
        {
            if (!Enum.IsDefined(typeof(OrderStatus), newStatus))
                throw new DomainException("Geçersiz sipariş durumu.");

            Status = newStatus;

            if (ItemTransitions.TryGetValue(newStatus, out var transition))
            {
                foreach (OrderItem item in _orderItems.Where(i => transition.from.Contains(i.Status)))
                    item.UpdateStatus(transition.to);
            }
        }

        // Kategoriye atanmış mutfak ("Izgara") toplu işlem yaptığında yalnızca kendi ürünleri ilerler; aynı masanın
        // tatlıları dokunulmadan kalır. Siparişin kendi durumu ancak tüm ürünler o aşamaya ulaştıysa değişir.
        public void UpdateStatusForItems(OrderStatus newStatus, Func<OrderItem, bool> isInScope)
        {
            if (!ItemTransitions.TryGetValue(newStatus, out var transition))
                throw new DomainException("Bu durum yalnızca siparişin tamamı için değiştirilebilir.");

            foreach (OrderItem item in _orderItems.Where(i => isInScope(i) && transition.from.Contains(i.Status)))
                item.UpdateStatus(transition.to);

            if (_orderItems.All(i => i.Status >= transition.to))
                Status = newStatus;
        }

        public void UpdateItemStatus(Guid orderItemId, OrderItemStatus status)
        {
            if (!Enum.IsDefined(typeof(OrderItemStatus), status))
                throw new DomainException("Geçersiz ürün durumu.");

            OrderItem? item = _orderItems.FirstOrDefault(x => x.Id == orderItemId);
            if (item == null)
                throw new DomainException("Böyle bir sipariş kalemi bulunamadı.");

            item.UpdateStatus(status);
        }

        public void UpdateItemNote(Guid orderItemId, string note)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.Id == orderItemId);
            if (item == null)
                throw new DomainException("Böyle bir sipariş kalemi bulunamadı.");

            item.UpdateNote(note?.Trim() ?? string.Empty);
        }

        /// <summary>
        /// Ürün seçmeden belirli bir tutar ödenir ("₺300'ünü kartla öde"). Ürünler masada kalır; tutar
        /// kalan hesaptan düşer. Kalanı tam kapatan ödeme hesaba yazılmaz, ürünlerle birlikte kapanış ödemesi olur.
        /// </summary>
        public void PayOnAccount(decimal amount)
        {
            if (IsClosed())
                throw new DomainException("Kapanmış bir siparişe ödeme alınamaz.");

            if (amount <= 0)
                throw new DomainException("Ödenecek tutar 0'dan büyük olmalı.");

            if (amount > RemainingAmount)
                throw new DomainException($"Girilen tutar kalan tutardan (₺{RemainingAmount:0.##}) fazla olamaz.");

            if (amount == RemainingAmount)
                throw new DomainException("Kalan tutarın tamamı hesaba yazılmaz; hesap ürünlerle birlikte kapatılmalı.");

            PaidOnAccount += amount;
        }

        public void Close()
        {
            Status = OrderStatus.Paid;
            BillRequestedAt = null;
            // Kapanış ödemesi hesaba alınanları ürünlere mahsup eder; bekleyen hesaba ödeme kalmaz.
            PaidOnAccount = 0m;
        }

        public void Cancel()
        {
            if (PaidOnAccount > 0)
                throw new DomainException($"Bu siparişten ₺{PaidOnAccount:0.##} ödeme alınmış, sipariş iptal edilemez. Kalan tutarı tahsil edip hesabı kapatın.");

            Status = OrderStatus.Cancelled;
            BillRequestedAt = null;
        }

        public bool IsClosed() => Status is OrderStatus.Paid or OrderStatus.Cancelled;

        // İlk istek anı korunur: tekrar basmak kasaya yeniden haber verir ama bekleme süresini sıfırlamaz.
        public void RequestBill(DateTime utcNow)
        {
            if (IsClosed())
                throw new DomainException("Kapanmış bir sipariş için hesap istenemez.");

            BillRequestedAt ??= utcNow;
        }

        public void ClearBillRequest()
        {
            BillRequestedAt = null;
        }

        public void MoveToTable(Guid newTableId)
        {
            if (newTableId == Guid.Empty)
                throw new DomainException("Geçersiz masa.");

            TableId = newTableId;
        }

        public void MergeFrom(Order source)
        {
            if (source is null)
                throw new DomainException("Geçersiz kaynak sipariş.");

            foreach (OrderItem item in source._orderItems.ToList())
            {
                OrderItem? existing = _orderItems.FirstOrDefault(x =>
                    x.ProductId == item.ProductId && x.Status == item.Status &&
                    x.UnitPrice == item.UnitPrice && x.TaxRate == item.TaxRate && x.Note == item.Note);

                if (existing != null)
                {
                    existing.AddQuantity(item.Quantity);
                    source._orderItems.Remove(item);
                }
                else
                {
                    item.ReassignOrder(this);
                    source._orderItems.Remove(item);
                    _orderItems.Add(item);
                }
            }

            if (string.IsNullOrEmpty(Note))
                Note = source.Note;
            else if (!string.IsNullOrEmpty(source.Note) && source.Note != Note)
                Note = $"{Note} / {source.Note}";

            // Kaynak masadan alınmış hesaba ödemeler birleşen hesaba taşınır.
            PaidOnAccount += source.PaidOnAccount;
            source.PaidOnAccount = 0m;

            RecalculateTotal();
            source.RecalculateTotal();
        }

        // Hesaba ödeme alınmışsa ürün iptaliyle hesap, ödenen tutarın altına inemez (iade akışı yok).
        private void EnsureTotalCoversPaidOnAccount(decimal newTotal)
        {
            if (PaidOnAccount > 0 && newTotal < PaidOnAccount)
                throw new DomainException($"Bu siparişten ₺{PaidOnAccount:0.##} ödeme alınmış; ürün iptaliyle hesap ödenen tutarın altına inemez.");
        }

        private void RecalculateTotal()
        {
            TotalPrice = _orderItems.Sum(x => x.UnitPrice * x.Quantity);
        }
        
    }
}
