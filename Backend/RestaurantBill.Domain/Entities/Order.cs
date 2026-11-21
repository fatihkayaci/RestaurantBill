using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Order : BaseEntity
    {
        public const string TableOnlyMessage = "Paket siparişte masa işlemi yapılamaz.";

        // Şube filtreleri buna bakar; masasız (paket) siparişte de doludur.
        public Guid BranchId { get; private set; }
        // Masa siparişinde dolu, paket siparişte null.
        public Guid? TableId { get; private set; }
        public Table? Table { get; private set; }
        public OrderType OrderType { get; private set; } = OrderType.DineIn;

        // Paket siparişin teslimat ücreti. Ürün satırı değildir: kendi ödeme satırıyla (Payment.IsDeliveryFee) tahsil
        // edilir, tahsil edilene kadar TotalPrice'a dahildir.
        public decimal DeliveryFee { get; private set; }
        public bool DeliveryFeeSettled { get; private set; }

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
        // Masa QR'ından bu hesaba sipariş veren telefonun cihaz anahtarının özeti (SHA-256, hex). Yalnız o telefon QR'dan
        // sipariş verebilir ve hesabı görür. Kilit siparişe bağlıdır: hesap kapanınca (ödendi/iptal) kendiliğinden düşer,
        // sipariş masa taşımada siparişle birlikte gider. null: masa QR'da kimseye bağlı değil.
        public string? QrOwnerTokenHash { get; private set; }
        private readonly List<OrderItem> _orderItems = new();
        public IReadOnlyCollection<OrderItem> OrderItems => _orderItems.AsReadOnly();

        protected Order() { }

        /// <summary>Masa siparişi. branchId, masanın bölgesinin şubesidir.</summary>
        public static Order Create(Guid tableId, Guid branchId)
        {
            if (tableId == Guid.Empty)
                throw new DomainException("Geçersiz masa.");

            if (branchId == Guid.Empty)
                throw new DomainException("Geçersiz şube.");

            return new Order
            {
                BranchId = branchId,
                TableId = tableId,
                OrderType = OrderType.DineIn,
                Status = OrderStatus.Active
            };
        }

        /// <summary>Kabul edilen online paket siparişin mutfak/hesap kaydı: masası yoktur, teslimat ücretini taşır.</summary>
        public static Order CreateDelivery(Guid branchId, decimal deliveryFee, string? note = null)
        {
            if (branchId == Guid.Empty)
                throw new DomainException("Geçersiz şube.");

            if (deliveryFee < 0)
                throw new DomainException("Teslimat ücreti negatif olamaz.");

            Order order = new()
            {
                BranchId = branchId,
                OrderType = OrderType.Delivery,
                DeliveryFee = deliveryFee,
                Note = note?.Trim() ?? string.Empty,
                Status = OrderStatus.Active
            };
            order.RecalculateTotal();
            return order;
        }

        public bool HasTable => TableId is not null;

        /// <summary>Masa taşıma, birleştirme, hesap isteme gibi yalnızca masada anlamı olan işlemlerin koruması.</summary>
        public void EnsureHasTable()
        {
            if (!HasTable)
                throw new DomainException(TableOnlyMessage);
        }

        public void AddItem(Product product, int quantity, decimal taxRate = 0m, string? note = null)
        {
            AddProductLine(product, product.Price, quantity, taxRate, note);
        }

        /// <summary>
        /// Ürünü verilen birim fiyatla ekler (paket siparişte müşterinin onayladığı fiyat). Ürünün güncel fiyatı
        /// sonradan değişmiş olsa da satır bu fiyatla yazılır.
        /// </summary>
        public void AddItemAtPrice(Product product, decimal unitPrice, int quantity, decimal taxRate, string? note = null)
        {
            AddProductLine(product, unitPrice, quantity, taxRate, note);
        }

        private void AddProductLine(Product product, decimal unitPrice, int quantity, decimal taxRate, string? note)
        {
            if (quantity <= 0)
                throw new DomainException("Miktar 0'dan büyük olmalı.");

            string normalizedNote = note?.Trim() ?? string.Empty;

            // Menü satırlarının ProductId'si yoktur; menü içeriği ise kendi menüsüne aittir, tek ürünle birleşmez.
            // Fiyatı farklı satırla birleşmez; aksi halde yeni adetler eski fiyattan yazılırdı.
            OrderItem? existing = _orderItems.FirstOrDefault(x =>
                x.ProductId == product.Id && !x.IsSetMenuComponent && x.Status == OrderItemStatus.Pending && x.Note == normalizedNote
                && x.UnitPrice == unitPrice);

            if (existing != null)
            {
                existing.AddQuantity(quantity);
                existing.Product = product;
            }
            else
            {
                _orderItems.Add(OrderItem.Create(unitPrice, quantity, product, taxRate, normalizedNote));
            }

            RecalculateTotal();

            if (Status < OrderStatus.Preparing)
                Status = OrderStatus.Pending;
        }

        /// <summary>
        /// Menüyü tek satır olarak ekler: fiyat = menü fiyatı + seçilen seçeneklerin ek ücreti. Seçilen her ürün bu satıra
        /// bağlı, fiyatı 0 olan ayrı bir kalem olur (mutfakta kendi istasyonuna düşer). Menü satırları hiçbir zaman
        /// birleştirilmez: aynı menü iki kez eklenirse iki ayrı satır olur.
        /// </summary>
        /// <param name="selections">Bölüm Id → seçilen ürün Id; seçilmeyen bölümde varsayılan seçenek kullanılır.</param>
        public OrderItem AddSetMenu(SetMenu setMenu, IReadOnlyDictionary<Guid, Guid> selections, int quantity, decimal taxRate, string? note = null)
            => AddSetMenuLine(setMenu, selections, unitPrice: null, quantity, taxRate, note);

        /// <summary>Menüyü verilen birim fiyatla ekler (paket siparişte müşterinin onayladığı, ek ücretler dahil fiyat).</summary>
        public OrderItem AddSetMenuAtPrice(SetMenu setMenu, IReadOnlyDictionary<Guid, Guid> selections, decimal unitPrice, int quantity, decimal taxRate, string? note = null)
            => AddSetMenuLine(setMenu, selections, unitPrice, quantity, taxRate, note);

        // unitPrice null: menünün güncel fiyatı + seçilen seçeneklerin ek ücreti.
        private OrderItem AddSetMenuLine(SetMenu setMenu, IReadOnlyDictionary<Guid, Guid> selections, decimal? unitPrice, int quantity, decimal taxRate, string? note)
        {
            if (setMenu is null)
                throw new DomainException("Geçersiz menü.");

            if (quantity <= 0)
                throw new DomainException("Miktar 0'dan büyük olmalı.");

            if (!setMenu.IsActive)
                throw new DomainException($"{setMenu.Name} şu an satışta değil.");

            // Ürün fiyatları düşünce menü indirimi fiyatı sıfırlamış olabilir; menü yeniden düzenlenmeli.
            if (setMenu.Price <= 0)
                throw new DomainException($"{setMenu.Name} menüsünün fiyatı geçersiz; menüyü düzenleyin.");

            IReadOnlyList<SetMenuSlotOption> chosen = setMenu.ResolveSelections(selections);
            SetMenuSlotOption? inactive = chosen.FirstOrDefault(o => !o.Product.IsActive);
            if (inactive is not null)
                throw new DomainException($"{inactive.Product.Name} şu an satışta değil, {setMenu.Name} için başka bir seçim yapın.");

            decimal linePrice = unitPrice ?? setMenu.Price + chosen.Sum(o => o.Surcharge);
            OrderItem parent = OrderItem.CreateSetMenu(setMenu, linePrice, quantity, taxRate, note?.Trim() ?? string.Empty);
            _orderItems.Add(parent);
            foreach (SetMenuSlotOption option in chosen)
                _orderItems.Add(OrderItem.CreateSetMenuComponent(parent, option.Product));

            RecalculateTotal();

            if (Status < OrderStatus.Preparing)
                Status = OrderStatus.Pending;

            return parent;
        }

        /// <summary>Menü satırının içindeki ürün kalemleri (menü satırı değilse boş).</summary>
        public IReadOnlyList<OrderItem> GetSetMenuComponents(OrderItem setMenuItem)
        {
            if (!setMenuItem.IsSetMenu)
                return [];

            // Yeni eklenen kalemlerde henüz Id yoktur, bağ gezinme özelliğindedir; veritabanından gelenlerde Id ile kurulur.
            return _orderItems
                .Where(i => i.ParentOrderItem == setMenuItem
                    || (i.ParentOrderItemId is not null && i.ParentOrderItemId == setMenuItem.Id))
                .ToList();
        }

        public void UpdateNote(string note)
        {
            Note = note ?? string.Empty;
        }

        public void RemoveItem(Guid productId)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.ProductId == productId && !x.IsSetMenuComponent);
            if (item == null)
                throw new DomainException("İptal etmek istediğiniz ürün zaten bu siparişte yok.");

            RemoveLine(item);
        }

        /// <summary>Satırı Id ile çıkarır; menü satırıysa içindeki ürünlerle birlikte.</summary>
        public void RemoveOrderItem(Guid orderItemId)
        {
            RemoveLine(FindLine(orderItemId, "İptal etmek istediğiniz ürün zaten bu siparişte yok."));
        }

        public void UpdateItemQuantity(Guid productId, int quantity)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.ProductId == productId && !x.IsSetMenuComponent);
            if (item == null)
                throw new DomainException("Güncellemek istediğiniz ürün bu siparişte yok.");

            ChangeLineQuantity(item, quantity);
        }

        /// <summary>Satırın adedini Id ile değiştirir; menü satırıysa içindeki ürünlerin adedi de değişir.</summary>
        public void UpdateOrderItemQuantity(Guid orderItemId, int quantity)
        {
            ChangeLineQuantity(FindLine(orderItemId, "Güncellemek istediğiniz ürün bu siparişte yok."), quantity);
        }

        /// <summary>
        /// Satırın verilen adedini iptal eder (3 ayrandan 1'i); adet satırın tamamıysa satır çıkar. Mutfağa geçmiş
        /// (hazırlanan, hazır, servis edilmiş) ürün de iptal edilebilir. Menü satırında menünün adedi düşer, içindeki
        /// ürünler de aynı adet kadar azalır; menüdeki tek bir ürün iptal edilemez. Ödenmiş adetler satırda kalmaz
        /// (SettleItem düşer), "Tutar gir" ile alınmış ödeme varsa hesap o tutarın altına inemez.
        /// </summary>
        /// <returns>İptal edilen satır (adı ve birim fiyatı kayıt için; satır çıkarıldıysa artık siparişte değildir).</returns>
        public OrderItem CancelOrderItem(Guid orderItemId, int quantity)
        {
            if (IsClosed())
                throw new DomainException("Kapanmış bir siparişte ürün iptal edilemez.");

            OrderItem item = FindLine(orderItemId, "İptal etmek istediğiniz ürün zaten bu siparişte yok.");

            if (quantity <= 0)
                throw new DomainException("İptal edilecek adet 0'dan büyük olmalı.");

            if (quantity > item.Quantity)
                throw new DomainException($"İptal edilecek adet, satırdaki ödenmemiş adetten ({item.Quantity}) fazla olamaz.");

            if (quantity == item.Quantity)
            {
                RemoveLine(item);
                return item;
            }

            EnsureTotalCoversPaidOnAccount(TotalPrice - item.UnitPrice * quantity);
            foreach (OrderItem line in GetSetMenuComponents(item).Append(item))
                line.ReduceQuantity(quantity);
            RecalculateTotal();
            return item;
        }

        // Hesapta görünen satır: tek ürün ya da menü. Menü içeriği tek başına iptal edilemez, adedi değiştirilemez.
        private OrderItem FindLine(Guid orderItemId, string notFoundMessage)
        {
            OrderItem item = _orderItems.FirstOrDefault(x => x.Id == orderItemId)
                ?? throw new DomainException(notFoundMessage);

            if (item.IsSetMenuComponent)
                throw new DomainException("Menüdeki bir ürün tek başına değiştirilemez; menünün tamamını değiştirin.");

            return item;
        }

        private void RemoveLine(OrderItem item)
        {
            EnsureTotalCoversPaidOnAccount(TotalPrice - item.UnitPrice * item.Quantity);
            foreach (OrderItem component in GetSetMenuComponents(item))
                _orderItems.Remove(component);
            _orderItems.Remove(item);
            RecalculateTotal();
        }

        private void ChangeLineQuantity(OrderItem item, int quantity)
        {
            if (quantity < item.Quantity)
                EnsureTotalCoversPaidOnAccount(TotalPrice - item.UnitPrice * (item.Quantity - quantity));

            IReadOnlyList<OrderItem> components = GetSetMenuComponents(item);
            if (components.Any(c => c.Status != OrderItemStatus.Pending))
                throw new DomainException("Mutfağa geçmiş bir menünün adedi değiştirilemez.");

            item.UpdateQuantity(quantity);
            foreach (OrderItem component in components)
                component.UpdateQuantity(quantity);
            RecalculateTotal();
        }

        public void SettleItem(Guid orderItemId, int paidQuantity)
        {
            OrderItem? item = _orderItems.FirstOrDefault(x => x.Id == orderItemId);
            if (item == null)
                throw new DomainException("Ödenmek istenen ürün bu siparişte yok.");

            if (item.IsSetMenuComponent)
                throw new DomainException("Menüdeki bir ürün ayrı ödenemez; menü satırını seçin.");

            if (paidQuantity <= 0)
                throw new DomainException("Ödenen miktar 0'dan büyük olmalı.");

            if (paidQuantity > item.Quantity)
                throw new DomainException("Ödenen miktar sipariş kalemindeki miktardan fazla olamaz.");

            // Menü satırı ödenince içindeki ürünler de aynı adet kadar düşer.
            foreach (OrderItem line in GetSetMenuComponents(item).Append(item))
            {
                if (paidQuantity == line.Quantity)
                    _orderItems.Remove(line);
                else
                    line.ReduceQuantity(paidQuantity);
            }

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
                foreach (OrderItem item in _orderItems.Where(i => !i.IsSetMenu && transition.from.Contains(i.Status)))
                    item.UpdateStatus(transition.to);
                SyncSetMenuStatuses();
            }
        }

        // Kategoriye atanmış mutfak ("Izgara") toplu işlem yaptığında yalnızca kendi ürünleri ilerler; aynı masanın
        // tatlıları dokunulmadan kalır. Siparişin kendi durumu ancak tüm ürünler o aşamaya ulaştıysa değişir.
        public void UpdateStatusForItems(OrderStatus newStatus, Func<OrderItem, bool> isInScope)
        {
            if (!ItemTransitions.TryGetValue(newStatus, out var transition))
                throw new DomainException("Bu durum yalnızca siparişin tamamı için değiştirilebilir.");

            // Menü satırının kategorisi yoktur; durumu içindeki ürünlerden türetilir.
            foreach (OrderItem item in _orderItems.Where(i => !i.IsSetMenu && isInScope(i) && transition.from.Contains(i.Status)))
                item.UpdateStatus(transition.to);
            SyncSetMenuStatuses();

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

            // Menü satırına verilen durum (ör. garson "Servis edildi") içindeki tüm ürünlere uygulanır.
            if (item.IsSetMenu)
            {
                foreach (OrderItem component in GetSetMenuComponents(item))
                    component.UpdateStatus(status);
            }
            else
            {
                item.UpdateStatus(status);
            }
            SyncSetMenuStatuses();
        }

        // Menü satırı, içindeki en geride kalan ürünün durumundadır: hepsi hazırsa Hazır, hepsi servis edildiyse Servis edildi.
        private void SyncSetMenuStatuses()
        {
            foreach (OrderItem setMenuItem in _orderItems.Where(i => i.IsSetMenu))
            {
                IReadOnlyList<OrderItem> components = GetSetMenuComponents(setMenuItem);
                if (components.Count > 0)
                    setMenuItem.UpdateStatus(components.Min(c => c.Status));
            }
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

        /// <summary>Teslimat ücretinin ödeme satırı (Payment.IsDeliveryFee) yazıldı; ücret artık kalan tutara dahil değil.</summary>
        public void SettleDeliveryFee()
        {
            if (DeliveryFee <= 0)
                throw new DomainException("Bu siparişin tahsil edilecek teslimat ücreti yok.");

            if (DeliveryFeeSettled)
                throw new DomainException("Teslimat ücreti zaten tahsil edildi.");

            if (IsClosed())
                throw new DomainException("Kapanmış bir siparişe ödeme alınamaz.");

            DeliveryFeeSettled = true;
            RecalculateTotal();
        }

        public void Close()
        {
            if (DeliveryFee > 0 && !DeliveryFeeSettled)
                throw new DomainException("Teslimat ücreti tahsil edilmeden paket sipariş kapatılamaz.");

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
            EnsureHasTable();

            if (IsClosed())
                throw new DomainException("Kapanmış bir sipariş için hesap istenemez.");

            BillRequestedAt ??= utcNow;
        }

        public void ClearBillRequest()
        {
            BillRequestedAt = null;
        }

        /// <summary>Hesabı QR'dan sipariş veren telefona bağlar (özet; anahtarın kendisi saklanmaz).</summary>
        public void SetQrOwner(string tokenHash)
        {
            EnsureHasTable();

            if (string.IsNullOrWhiteSpace(tokenHash))
                throw new DomainException("Geçersiz cihaz anahtarı.");

            if (IsClosed())
                throw new DomainException("Kapanmış bir hesap telefona bağlanamaz.");

            QrOwnerTokenHash = tokenHash;
        }

        /// <summary>Personelin "QR kilidini aç"ı: masada başka bir telefon sipariş verebilir.</summary>
        public void ClearQrOwner()
        {
            QrOwnerTokenHash = null;
        }

        public void MoveToTable(Guid newTableId)
        {
            EnsureHasTable();

            if (newTableId == Guid.Empty)
                throw new DomainException("Geçersiz masa.");

            TableId = newTableId;
        }

        public void MergeFrom(Order source)
        {
            if (source is null)
                throw new DomainException("Geçersiz kaynak sipariş.");

            EnsureHasTable();
            source.EnsureHasTable();

            foreach (OrderItem item in source._orderItems.ToList())
            {
                // Menü satırları ve içerikleri birleştirilmeden, aralarındaki bağla birlikte taşınır.
                bool isSetMenuLine = item.IsSetMenu || item.IsSetMenuComponent;
                OrderItem? existing = isSetMenuLine ? null : _orderItems.FirstOrDefault(x =>
                    !x.IsSetMenu && !x.IsSetMenuComponent &&
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

        // Tahsil edilmemiş teslimat ücreti hesabın parçasıdır; SettleDeliveryFee ile düşer.
        private void RecalculateTotal()
        {
            TotalPrice = _orderItems.Sum(x => x.UnitPrice * x.Quantity) + (DeliveryFeeSettled ? 0m : DeliveryFee);
        }
        
    }
}
