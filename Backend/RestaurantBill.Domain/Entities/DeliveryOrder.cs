using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Entities
{
    /// <summary>
    /// Online paket siparişin müşteri tarafı. Kabul edilince mutfak ve hesap için masasız bir <see cref="Order"/> açılır;
    /// reddedilen sipariş Orders tablosuna hiç girmez.
    /// Durumlar: Received → Accepted → Preparing → Ready → OnTheWay → Delivered; Received → Rejected | Cancelled (müşteri);
    /// Accepted…OnTheWay → Cancelled (personel, nedenli). Kasada teslim alma durum değildir, yalnızca SettledAt yazar.
    /// </summary>
    public class DeliveryOrder : BaseEntity
    {
        public const int MaxLines = 50;
        public const int MaxQuantity = 50;
        public const decimal MaxTotal = 20000m;
        public const int NameMaxLength = 80;
        public const int AddressMaxLength = 400;
        public const int DirectionsMaxLength = 300;
        public const int NoteMaxLength = 500;
        public const int ReasonMaxLength = 300;
        // Sahibin kararı: müşteriye "Restoran şu an yanıt veremedi" gösterilir.
        public const string AutoRejectReason = "Restoran şu an yanıt veremedi.";

        public Guid BranchId { get; private set; }
        /// <summary>Şube içinde artan, ekranda "PAKET #123" olarak görünen numara.</summary>
        public int Number { get; private set; }
        /// <summary>Takip sayfasının gizli anahtarı (128 bit rastgele).</summary>
        public string AccessToken { get; private set; } = string.Empty;
        /// <summary>İstemcinin ürettiği tekrar gönderim anahtarı; aynı istek iki sipariş açmaz.</summary>
        public Guid ClientRequestId { get; private set; }
        public DeliveryOrderStatus Status { get; private set; } = DeliveryOrderStatus.Received;

        public string CustomerName { get; private set; } = string.Empty;
        /// <summary>TurkishPhone biçiminde.</summary>
        public string CustomerPhone { get; private set; } = string.Empty;
        public string Address { get; private set; } = string.Empty;
        public string AddressDirections { get; private set; } = string.Empty;
        public string Note { get; private set; } = string.Empty;

        // Bölge silinse/değişse de siparişte o anki ad ve ücret kalır.
        public Guid? DeliveryZoneId { get; private set; }
        public string ZoneName { get; private set; } = string.Empty;
        public decimal Subtotal { get; private set; }
        public decimal DeliveryFee { get; private set; }
        public decimal Total { get; private set; }
        /// <summary>Müşterinin kapıda ödeme tercihi: Nakit ya da Kart.</summary>
        public PaymentMethod PaymentPreference { get; private set; }

        public Guid? OrderId { get; private set; }
        public Order? Order { get; private set; }
        public int? EstimatedMinutes { get; private set; }
        public DateTime? AcceptedAt { get; private set; }
        public Guid? AcceptedByUserId { get; private set; }
        public DateTime? RejectedAt { get; private set; }
        /// <summary>Otomatik retlerde null.</summary>
        public Guid? RejectedByUserId { get; private set; }
        public string RejectReason { get; private set; } = string.Empty;
        public DateTime? CancelledAt { get; private set; }
        /// <summary>Müşteri iptalinde null.</summary>
        public Guid? CancelledByUserId { get; private set; }
        public string CancelReason { get; private set; } = string.Empty;

        public Guid? CourierUserId { get; private set; }
        public DateTime? DispatchedAt { get; private set; }
        public DateTime? DeliveredAt { get; private set; }
        // Kurye "Teslim ettim · Nakit/Kart" dediğinde yazılır; kasaya girmesi kasiyerin "Teslim al"ıyla olur.
        public PaymentMethod? CollectedMethod { get; private set; }
        public decimal? CollectedAmount { get; private set; }
        public DateTime? CollectedAt { get; private set; }
        public DateTime? SettledAt { get; private set; }
        public Guid? SettledByUserId { get; private set; }

        public string ClientIp { get; private set; } = string.Empty;

        private readonly List<DeliveryOrderLine> _lines = new();
        public IReadOnlyCollection<DeliveryOrderLine> Lines => _lines.AsReadOnly();

        protected DeliveryOrder() { }

        public static DeliveryOrder Create(Guid branchId, int number, Guid clientRequestId, string customerName, string customerPhone,
            string address, string? addressDirections, string? note, DeliveryZone zone, PaymentMethod paymentPreference, string? clientIp)
        {
            if (branchId == Guid.Empty)
                throw new DomainException("Geçersiz şube.");
            if (number <= 0)
                throw new DomainException("Geçersiz sipariş numarası.");
            if (clientRequestId == Guid.Empty)
                throw new DomainException("Geçersiz istek.");
            if (zone is null || zone.BranchId != branchId)
                throw new DomainException("Geçersiz teslimat bölgesi.");
            if (!zone.IsActive)
                throw new DomainException($"{zone.Name} bölgesine şu an teslimat yapılmıyor.");
            if (paymentPreference is not (PaymentMethod.Nakit or PaymentMethod.Kart))
                throw new DomainException("Kapıda ödeme nakit ya da kart olabilir.");

            string name = Required(customerName, NameMaxLength, "Ad soyad");
            string phone = TurkishPhone.Normalize(customerPhone);
            if (phone.Length == 0)
                throw new DomainException("Geçerli bir telefon numarası girin.");

            DeliveryOrder order = new()
            {
                BranchId = branchId,
                Number = number,
                AccessToken = Shared.AccessToken.New(),
                ClientRequestId = clientRequestId,
                Status = DeliveryOrderStatus.Received,
                CustomerName = name,
                CustomerPhone = phone,
                Address = Required(address, AddressMaxLength, "Adres"),
                AddressDirections = Optional(addressDirections, DirectionsMaxLength, "Adres tarifi"),
                Note = Optional(note, NoteMaxLength, "Sipariş notu"),
                DeliveryZoneId = zone.Id,
                ZoneName = zone.Name,
                DeliveryFee = zone.Fee,
                PaymentPreference = paymentPreference,
                ClientIp = clientIp?.Trim() ?? string.Empty
            };
            order.RecalculateTotals();
            return order;
        }

        /// <summary>Fiyatı sunucu hesaplar (sepet fiyatlandırma); satırlar sipariş alınırken eklenir, sonra değişmez.</summary>
        public DeliveryOrderLine AddProductLine(Product product, decimal unitPrice, decimal taxRate, int quantity, string? note)
        {
            if (product is null)
                throw new DomainException("Geçersiz ürün.");
            return AddLine(DeliveryOrderLine.ForProduct(product, unitPrice, taxRate, quantity, Optional(note, DeliveryOrderLine.NoteMaxLength, "Ürün notu")));
        }

        /// <param name="selectionsJson">Menü bölümü → seçilen ürün eşlemesi; kabulde Order.AddSetMenuAtPrice'a verilir.</param>
        public DeliveryOrderLine AddSetMenuLine(SetMenu setMenu, decimal unitPrice, decimal taxRate, int quantity, string selectionsJson, string? note)
        {
            if (setMenu is null)
                throw new DomainException("Geçersiz menü.");
            return AddLine(DeliveryOrderLine.ForSetMenu(setMenu, unitPrice, taxRate, quantity, selectionsJson ?? "{}",
                Optional(note, DeliveryOrderLine.NoteMaxLength, "Ürün notu")));
        }

        private DeliveryOrderLine AddLine(DeliveryOrderLine line)
        {
            if (Status != DeliveryOrderStatus.Received || OrderId is not null)
                throw new DomainException("Alınmış siparişin ürünleri değiştirilemez.");
            if (_lines.Count >= MaxLines)
                throw new DomainException($"Bir siparişte en fazla {MaxLines} kalem olabilir.");
            if (line.Quantity < 1 || line.Quantity > MaxQuantity)
                throw new DomainException($"Adet 1 ile {MaxQuantity} arasında olmalı.");

            _lines.Add(line);
            RecalculateTotals();
            if (Total > MaxTotal)
            {
                _lines.Remove(line);
                RecalculateTotals();
                throw new DomainException($"Online sipariş tutarı en fazla ₺{MaxTotal:0} olabilir.");
            }
            return line;
        }

        /// <summary>Received → Accepted. Mutfak siparişi (Order) bu anda açılır ve buraya bağlanır.</summary>
        public void Accept(Order order, int estimatedMinutes, Guid userId, DateTime utcNow)
        {
            EnsureStatus("Yalnızca yeni gelen sipariş kabul edilebilir.", DeliveryOrderStatus.Received);

            if (order is null || order.OrderType != OrderType.Delivery || order.BranchId != BranchId)
                throw new DomainException("Geçersiz paket sipariş kaydı.");
            if (estimatedMinutes < DeliveryZone.EstimatedMinutesMin || estimatedMinutes > DeliveryZone.EstimatedMinutesMax)
                throw new DomainException($"Tahmini süre {DeliveryZone.EstimatedMinutesMin}–{DeliveryZone.EstimatedMinutesMax} dakika arasında olmalı.");
            if (_lines.Count == 0)
                throw new DomainException("Siparişte ürün yok.");

            Order = order;
            OrderId = order.Id;
            EstimatedMinutes = estimatedMinutes;
            AcceptedAt = utcNow;
            AcceptedByUserId = userId;
            Status = DeliveryOrderStatus.Accepted;
        }

        /// <summary>Received → Rejected (personel). Neden müşteriye gösterilir.</summary>
        public void Reject(string reason, Guid userId, DateTime utcNow)
        {
            EnsureStatus("Yalnızca yeni gelen sipariş reddedilebilir.", DeliveryOrderStatus.Received);
            RejectReason = Required(reason, ReasonMaxLength, "Ret nedeni");
            RejectedByUserId = userId;
            RejectedAt = utcNow;
            Status = DeliveryOrderStatus.Rejected;
        }

        /// <summary>Received → Rejected, yanıtlanmadan beklerken süre dolunca (şube ayarı).</summary>
        public void AutoReject(DateTime utcNow, int afterMinutes)
        {
            EnsureStatus("Yalnızca yeni gelen sipariş reddedilebilir.", DeliveryOrderStatus.Received);
            if (utcNow < CreatedAt.AddMinutes(afterMinutes))
                throw new DomainException("Otomatik ret süresi dolmadı.");

            RejectReason = AutoRejectReason;
            RejectedByUserId = null;
            RejectedAt = utcNow;
            Status = DeliveryOrderStatus.Rejected;
        }

        /// <summary>Received → Cancelled, müşteri takip sayfasından; kabul edildikten sonra müşteri iptal edemez.</summary>
        public void CancelByCustomer(DateTime utcNow)
        {
            EnsureStatus("Sipariş restoran tarafından alındı; iptal için restoranı arayın.", DeliveryOrderStatus.Received);
            CancelledAt = utcNow;
            CancelledByUserId = null;
            Status = DeliveryOrderStatus.Cancelled;
        }

        /// <summary>Accepted…OnTheWay → Cancelled, personel nedenli. Bağlı Order'ın iptali çağıranın işidir.</summary>
        public void CancelByStaff(string reason, Guid userId, DateTime utcNow)
        {
            EnsureStatus("Bu aşamadaki sipariş iptal edilemez.",
                DeliveryOrderStatus.Accepted, DeliveryOrderStatus.Preparing, DeliveryOrderStatus.Ready, DeliveryOrderStatus.OnTheWay);
            CancelReason = Required(reason, ReasonMaxLength, "İptal nedeni");
            CancelledByUserId = userId;
            CancelledAt = utcNow;
            Status = DeliveryOrderStatus.Cancelled;
        }

        /// <summary>
        /// Mutfak durumundan türetilen ilerleme (Accepted → Preparing → Ready). Yalnızca ileri gider; mutfak doğrudan
        /// "Hazır" derse Preparing atlanır. Durum değiştiyse true.
        /// </summary>
        public bool AdvanceFromKitchen(OrderStatus kitchenStatus)
        {
            DeliveryOrderStatus? target = kitchenStatus switch
            {
                OrderStatus.Preparing => DeliveryOrderStatus.Preparing,
                OrderStatus.Ready or OrderStatus.Served => DeliveryOrderStatus.Ready,
                _ => null
            };

            if (target is null || Status is not (DeliveryOrderStatus.Accepted or DeliveryOrderStatus.Preparing) || target <= Status)
                return false;

            Status = target.Value;
            return true;
        }

        /// <summary>Yola çıkmadan önce kurye atanır ya da değiştirilir.</summary>
        public void AssignCourier(Guid courierUserId)
        {
            EnsureStatus("Yola çıkmış ya da kapanmış siparişin kuryesi değiştirilemez.",
                DeliveryOrderStatus.Accepted, DeliveryOrderStatus.Preparing, DeliveryOrderStatus.Ready);
            if (courierUserId == Guid.Empty)
                throw new DomainException("Geçersiz kurye.");

            CourierUserId = courierUserId;
        }

        /// <summary>Yola çıkmadan önce atanmış kurye kaldırılır.</summary>
        public void UnassignCourier()
        {
            EnsureStatus("Yola çıkmış ya da kapanmış siparişin kuryesi değiştirilemez.",
                DeliveryOrderStatus.Accepted, DeliveryOrderStatus.Preparing, DeliveryOrderStatus.Ready);
            CourierUserId = null;
        }

        /// <summary>Ready → OnTheWay; kurye atanmış olmalı.</summary>
        public void Dispatch(DateTime utcNow)
        {
            EnsureStatus("Yalnızca hazır sipariş yola çıkabilir.", DeliveryOrderStatus.Ready);
            if (CourierUserId is null)
                throw new DomainException("Önce kurye atayın.");

            DispatchedAt = utcNow;
            Status = DeliveryOrderStatus.OnTheWay;
        }

        /// <summary>OnTheWay → Delivered. Kurye tahsilatı (nakit/kart) kaydeder; tutar siparişin toplamıdır.</summary>
        public void Deliver(PaymentMethod collectedMethod, DateTime utcNow)
        {
            EnsureStatus("Yalnızca yoldaki sipariş teslim edilebilir.", DeliveryOrderStatus.OnTheWay);
            if (collectedMethod is not (PaymentMethod.Nakit or PaymentMethod.Kart))
                throw new DomainException("Tahsilat nakit ya da kart olabilir.");

            DeliveredAt = utcNow;
            CollectedMethod = collectedMethod;
            CollectedAmount = Total;
            CollectedAt = utcNow;
            Status = DeliveryOrderStatus.Delivered;
        }

        public bool IsSettled => SettledAt is not null;

        /// <summary>Kasiyerin "Teslim al"ı: tahsilat kasaya geçti. Durum değişmez; bağlı Order'ı ödeme kaydı kapatır.</summary>
        public void Settle(Guid userId, DateTime utcNow)
        {
            EnsureStatus("Yalnızca teslim edilmiş siparişin tahsilatı alınabilir.", DeliveryOrderStatus.Delivered);
            if (CollectedAt is null)
                throw new DomainException("Bu siparişin tahsilatı kaydedilmemiş.");
            if (IsSettled)
                throw new DomainException("Bu siparişin tahsilatı zaten alındı.");

            SettledAt = utcNow;
            SettledByUserId = userId;
        }

        public bool IsOpen => Status is not (DeliveryOrderStatus.Delivered or DeliveryOrderStatus.Rejected or DeliveryOrderStatus.Cancelled);

        private void EnsureStatus(string message, params DeliveryOrderStatus[] allowed)
        {
            if (!allowed.Contains(Status))
                throw new DomainException(message);
        }

        private void RecalculateTotals()
        {
            Subtotal = _lines.Sum(l => l.UnitPrice * l.Quantity);
            Total = Subtotal + DeliveryFee;
        }

        private static string Required(string? value, int maxLength, string label)
        {
            string trimmed = value?.Trim() ?? string.Empty;
            if (trimmed.Length == 0)
                throw new DomainException($"{label} boş olamaz.");
            if (trimmed.Length > maxLength)
                throw new DomainException($"{label} en fazla {maxLength} karakter olabilir.");
            return trimmed;
        }

        private static string Optional(string? value, int maxLength, string label)
        {
            string trimmed = value?.Trim() ?? string.Empty;
            if (trimmed.Length > maxLength)
                throw new DomainException($"{label} en fazla {maxLength} karakter olabilir.");
            return trimmed;
        }
    }

    public class DeliveryOrderLine : BaseEntity
    {
        public const int NoteMaxLength = 300;

        public Guid DeliveryOrderId { get; private set; }
        public DeliveryOrder DeliveryOrder { get; private set; } = default!;
        public DeliveryOrderLineKind Kind { get; private set; }
        // Ürün/menü sonradan silinse de satır adı ve fiyatıyla kalır.
        public Guid? ProductId { get; private set; }
        public Product? Product { get; private set; }
        public Guid? SetMenuId { get; private set; }
        public SetMenu? SetMenu { get; private set; }
        public string NameSnapshot { get; private set; } = string.Empty;
        public decimal UnitPrice { get; private set; }
        public decimal TaxRate { get; private set; }
        public int Quantity { get; private set; }
        public string Note { get; private set; } = string.Empty;
        /// <summary>Menü satırında bölüm Id → ürün Id (JSON); ürün satırında "{}".</summary>
        public string SelectionsJson { get; private set; } = "{}";

        protected DeliveryOrderLine() { }

        internal static DeliveryOrderLine ForProduct(Product product, decimal unitPrice, decimal taxRate, int quantity, string note)
        {
            EnsurePrice(unitPrice, taxRate);
            return new DeliveryOrderLine
            {
                Kind = DeliveryOrderLineKind.Product,
                Product = product,
                ProductId = product.Id,
                NameSnapshot = product.Name,
                UnitPrice = unitPrice,
                TaxRate = taxRate,
                Quantity = quantity,
                Note = note
            };
        }

        internal static DeliveryOrderLine ForSetMenu(SetMenu setMenu, decimal unitPrice, decimal taxRate, int quantity, string selectionsJson, string note)
        {
            EnsurePrice(unitPrice, taxRate);
            return new DeliveryOrderLine
            {
                Kind = DeliveryOrderLineKind.SetMenu,
                SetMenu = setMenu,
                SetMenuId = setMenu.Id,
                NameSnapshot = setMenu.Name,
                UnitPrice = unitPrice,
                TaxRate = taxRate,
                Quantity = quantity,
                Note = note,
                SelectionsJson = selectionsJson
            };
        }

        private static void EnsurePrice(decimal unitPrice, decimal taxRate)
        {
            if (unitPrice < 0)
                throw new DomainException("Birim fiyat negatif olamaz.");
            if (taxRate < 0 || taxRate > 100)
                throw new DomainException("KDV oranı 0 ile 100 arasında olmalıdır.");
        }
    }
}
