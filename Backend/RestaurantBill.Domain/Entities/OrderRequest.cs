using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    // Müşterinin masadaki QR'dan gönderdiği sipariş talebi ya da rezervasyonun ön siparişi. Personel onaylayınca
    // (ön siparişte misafir gelince) masanın siparişine eklenir.
    public class OrderRequest : BaseEntity
    {
        public const int MaxItems = 50;
        public const int MaxQuantity = 50;

        public Guid TableId { get; private set; }
        public Table Table { get; private set; } = default!;
        public string Note { get; private set; } = string.Empty;
        public OrderRequestStatus Status { get; private set; } = OrderRequestStatus.Pending;
        public OrderRequestKind Kind { get; private set; } = OrderRequestKind.TableQr;
        // Ön siparişin rezervasyonu; QR talebinde null.
        public Guid? ReservationId { get; private set; }
        public Reservation? Reservation { get; private set; }
        // Müşteriye gösterilen ret nedeni; boş olabilir.
        public string RejectReason { get; private set; } = string.Empty;

        public const int RejectReasonMaxLength = 300;

        // QR talebini gönderen telefonun cihaz anahtarının özeti (SHA-256, hex; anahtarın kendisi saklanmaz). Telefon kendi
        // taleplerini ve katıldığı hesabı bununla tanır. Ön siparişte ve eski taleplerde null.
        public string? DeviceTokenHash { get; private set; }
        // Talebin yazıldığı hesap (onayda ya da ön siparişin masaya geçişinde). Hesap ödendikten sonra "Ödendi" fişi
        // yalnız bu hesaba talebi yazılan telefonlarda görünür. Bekleyen/reddedilen talepte ve eski kayıtlarda null.
        public Guid? OrderId { get; private set; }
        // Onayda kalemler talebe bağlanarak (OrderItem.OrderRequestId) yazıldı. Bu alan eklenmeden önce onaylanan
        // taleplerde false: onların kalemleri bilinmez, aşama hesabın durumundan tahmin edilir (OrderRequestStages).
        public bool ItemsLinked { get; private set; }

        private readonly List<OrderRequestItem> _items = new();
        public IReadOnlyCollection<OrderRequestItem> Items => _items.AsReadOnly();

        protected OrderRequest() { }

        public static OrderRequest Create(Guid tableId, string? note, string? deviceTokenHash = null)
        {
            if (tableId == Guid.Empty)
                throw new DomainException("Geçersiz masa.");

            return new OrderRequest
            {
                TableId = tableId,
                Note = note?.Trim() ?? string.Empty,
                Status = OrderRequestStatus.Pending,
                DeviceTokenHash = string.IsNullOrWhiteSpace(deviceTokenHash) ? null : deviceTokenHash
            };
        }

        /// <summary>Rezervasyonun ön siparişi: rezervasyonun masasına yazılır, misafir gelene kadar Pending kalır.</summary>
        public static OrderRequest CreatePreOrder(Reservation reservation, string? note)
        {
            if (reservation is null)
                throw new DomainException("Geçersiz rezervasyon.");

            if (reservation.Status != ReservationStatus.Confirmed)
                throw new DomainException("Ön sipariş yalnızca onaylı rezervasyona verilebilir.");

            return new OrderRequest
            {
                TableId = reservation.TableId,
                ReservationId = reservation.Id,
                Kind = OrderRequestKind.PreOrder,
                Note = note?.Trim() ?? string.Empty,
                Status = OrderRequestStatus.Pending
            };
        }

        /// <param name="unitPrice">Ön siparişte müşterinin gördüğü fiyat; QR talebinde null (onayda güncel fiyat).</param>
        /// <param name="isTakeaway">Müşteri QR'da "Paket olsun" dedi: kalem masada değil, paketlenip verilir.</param>
        public void AddItem(Product product, int quantity, string? note, decimal? unitPrice = null, bool isTakeaway = false)
        {
            if (product is null)
                throw new DomainException("Geçersiz ürün.");
            EnsureCanAdd(quantity, unitPrice);

            _items.Add(OrderRequestItem.Create(product, quantity, note?.Trim() ?? string.Empty, unitPrice, isTakeaway));
        }

        /// <summary>
        /// Menü (set) kalemi. <paramref name="selectionsJson"/> varsayılanlar dahil tüm bölümlerin seçimi (bölüm Id → ürün
        /// Id); doğrulaması fiyatlandırmada (OrderPricingService) yapılır. unitPrice QR talebinde null (onayda güncel fiyat).
        /// </summary>
        public void AddSetMenuItem(SetMenu setMenu, int quantity, string selectionsJson, string? note, decimal? unitPrice = null, bool isTakeaway = false)
        {
            if (setMenu is null)
                throw new DomainException("Geçersiz menü.");
            EnsureCanAdd(quantity, unitPrice);

            _items.Add(OrderRequestItem.CreateSetMenu(setMenu, quantity, selectionsJson, note?.Trim() ?? string.Empty, unitPrice, isTakeaway));
        }

        private void EnsureCanAdd(int quantity, decimal? unitPrice)
        {
            if (quantity <= 0 || quantity > MaxQuantity)
                throw new DomainException($"Adet 1 ile {MaxQuantity} arasında olmalı.");
            if (_items.Count >= MaxItems)
                throw new DomainException($"Bir talepte en fazla {MaxItems} kalem olabilir.");
            if (unitPrice is < 0)
                throw new DomainException("Birim fiyat negatif olamaz.");
        }

        /// <summary>Talep onaylandı ve kalemleri <paramref name="orderId"/> hesabına yazıldı.</summary>
        public void Approve(Guid orderId)
        {
            EnsurePending();

            if (orderId == Guid.Empty)
                throw new DomainException("Geçersiz sipariş.");

            Status = OrderRequestStatus.Approved;
            OrderId = orderId;
            ItemsLinked = true;
        }

        /// <summary>Hesap başka bir hesapla birleşti (masa birleştirme): talep artık birleşen hesabın parçasıdır.</summary>
        public void MoveToOrder(Guid orderId)
        {
            if (orderId == Guid.Empty)
                throw new DomainException("Geçersiz sipariş.");

            if (Status != OrderRequestStatus.Approved)
                throw new DomainException("Yalnızca onaylanmış talep başka hesaba taşınabilir.");

            OrderId = orderId;
        }

        public void Reject(string? reason = null)
        {
            EnsurePending();

            string trimmed = reason?.Trim() ?? string.Empty;
            if (trimmed.Length > RejectReasonMaxLength)
                throw new DomainException($"Ret nedeni en fazla {RejectReasonMaxLength} karakter olabilir.");

            Status = OrderRequestStatus.Rejected;
            RejectReason = trimmed;
        }

        /// <summary>Ön siparişi müşteri iptal etti ya da rezervasyon iptal/ret/gelmedi oldu.</summary>
        public void Cancel()
        {
            EnsurePending();
            Status = OrderRequestStatus.Cancelled;
        }

        /// <summary>Misafir gelmeden süresi geçen ön sipariş.</summary>
        public void Expire()
        {
            EnsurePending();
            if (Kind != OrderRequestKind.PreOrder)
                throw new DomainException("Yalnızca ön siparişlerin süresi dolar.");
            Status = OrderRequestStatus.Expired;
        }

        /// <summary>Ön siparişin kalemleri değiştirilecekse (misafir gelene kadar) önce eskileri silinir.</summary>
        public void ClearItems()
        {
            EnsurePending();
            _items.Clear();
        }

        /// <summary>Ön siparişi değiştiren müşteri notunu da yeniler (misafir gelene kadar).</summary>
        public void UpdateNote(string? note)
        {
            EnsurePending();
            Note = note?.Trim() ?? string.Empty;
        }

        private void EnsurePending()
        {
            if (Status != OrderRequestStatus.Pending)
                throw new DomainException("Bu talep zaten işlendi.");
        }
    }

    /// <summary>Müşterinin QR'da gördüğü sipariş aşamasının türetilmesi (saklanmaz).</summary>
    public static class OrderRequestStages
    {
        /// <param name="linkedItemStatuses">
        /// Talebin hâlâ hesapta duran kalemlerinin durumları (menü satırı hariç, menü içerikleri dahil). Ödenen ya da
        /// iptal edilen kalem hesaptan düştüğü için listede yoktur: bitmiş sayılır.
        /// </param>
        /// <param name="orderClosed">Talebin yazıldığı hesap ödendi / iptal edildi (eski talepler için tahmin).</param>
        public static OrderRequestStage Derive(OrderRequestStatus status, bool itemsLinked, bool orderClosed,
            IReadOnlyCollection<OrderItemStatus> linkedItemStatuses)
        {
            switch (status)
            {
                case OrderRequestStatus.Pending:
                    return OrderRequestStage.Sent;
                case OrderRequestStatus.Rejected:
                    return OrderRequestStage.Rejected;
                case OrderRequestStatus.Cancelled:
                case OrderRequestStatus.Expired:
                    return OrderRequestStage.Cancelled;
            }

            if (linkedItemStatuses.Count == 0)
            {
                // Bağlı kalemlerin hepsi ödendi / çıkarıldı; eski talepte kalem bilinmez, hesap kapandıysa servis edilmiştir.
                if (itemsLinked || orderClosed)
                    return OrderRequestStage.Served;
                return OrderRequestStage.Approved;
            }

            // En geride kalan kalem belirler: hepsi servis edildiyse Servis edildi, hepsi hazır (ya da ötesi) ise
            // "Masanıza geliyor". Mutfak herhangi bir kalemde başladıysa Hazırlanıyor.
            OrderItemStatus least = linkedItemStatuses.Min();
            if (least >= OrderItemStatus.Served)
                return OrderRequestStage.Served;
            if (least >= OrderItemStatus.Ready)
                return OrderRequestStage.OnTheWay;
            if (linkedItemStatuses.Any(s => s > OrderItemStatus.Pending))
                return OrderRequestStage.Preparing;
            return OrderRequestStage.Approved;
        }
    }

    public class OrderRequestItem : BaseEntity
    {
        public Guid OrderRequestId { get; private set; }
        public OrderRequest OrderRequest { get; private set; } = default!;
        // Kalem ya ürün (ProductId) ya da menüdür (SetMenuId + SelectionsJson).
        public Guid? ProductId { get; private set; }
        public Product? Product { get; private set; }
        public Guid? SetMenuId { get; private set; }
        public SetMenu? SetMenu { get; private set; }
        /// <summary>Menü kaleminde bölüm Id → ürün Id (JSON, varsayılanlar dahil); ürün kaleminde "{}".</summary>
        public string SelectionsJson { get; private set; } = "{}";
        public int Quantity { get; private set; }
        public string Note { get; private set; } = string.Empty;
        // Ön siparişte fiyat anlık görüntüsü; QR talebinde null.
        public decimal? UnitPrice { get; private set; }
        // Müşteri bu kalem için "Paket olsun" dedi; onayda siparişin kalemine (OrderItem.IsTakeaway) taşınır.
        public bool IsTakeaway { get; private set; }

        public bool IsSetMenu => SetMenuId is not null;

        protected OrderRequestItem() { }

        internal static OrderRequestItem CreateSetMenu(SetMenu setMenu, int quantity, string selectionsJson, string note, decimal? unitPrice, bool isTakeaway)
        {
            return new OrderRequestItem
            {
                SetMenu = setMenu,
                SetMenuId = setMenu.Id,
                SelectionsJson = string.IsNullOrWhiteSpace(selectionsJson) ? "{}" : selectionsJson,
                Quantity = quantity,
                Note = note,
                UnitPrice = unitPrice,
                IsTakeaway = isTakeaway
            };
        }

        internal static OrderRequestItem Create(Product product, int quantity, string note, decimal? unitPrice, bool isTakeaway)
        {
            return new OrderRequestItem
            {
                Product = product,
                ProductId = product.Id,
                Quantity = quantity,
                Note = note,
                UnitPrice = unitPrice,
                IsTakeaway = isTakeaway
            };
        }
    }
}
