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
        public void AddItem(Product product, int quantity, string? note, decimal? unitPrice = null)
        {
            if (product is null)
                throw new DomainException("Geçersiz ürün.");
            EnsureCanAdd(quantity, unitPrice);

            _items.Add(OrderRequestItem.Create(product, quantity, note?.Trim() ?? string.Empty, unitPrice));
        }

        /// <summary>
        /// Menü (set) kalemi. <paramref name="selectionsJson"/> varsayılanlar dahil tüm bölümlerin seçimi (bölüm Id → ürün
        /// Id); doğrulaması fiyatlandırmada (OrderPricingService) yapılır. unitPrice QR talebinde null (onayda güncel fiyat).
        /// </summary>
        public void AddSetMenuItem(SetMenu setMenu, int quantity, string selectionsJson, string? note, decimal? unitPrice = null)
        {
            if (setMenu is null)
                throw new DomainException("Geçersiz menü.");
            EnsureCanAdd(quantity, unitPrice);

            _items.Add(OrderRequestItem.CreateSetMenu(setMenu, quantity, selectionsJson, note?.Trim() ?? string.Empty, unitPrice));
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

        public void Approve()
        {
            EnsurePending();
            Status = OrderRequestStatus.Approved;
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

        public bool IsSetMenu => SetMenuId is not null;

        protected OrderRequestItem() { }

        internal static OrderRequestItem CreateSetMenu(SetMenu setMenu, int quantity, string selectionsJson, string note, decimal? unitPrice)
        {
            return new OrderRequestItem
            {
                SetMenu = setMenu,
                SetMenuId = setMenu.Id,
                SelectionsJson = string.IsNullOrWhiteSpace(selectionsJson) ? "{}" : selectionsJson,
                Quantity = quantity,
                Note = note,
                UnitPrice = unitPrice
            };
        }

        internal static OrderRequestItem Create(Product product, int quantity, string note, decimal? unitPrice)
        {
            return new OrderRequestItem
            {
                Product = product,
                ProductId = product.Id,
                Quantity = quantity,
                Note = note,
                UnitPrice = unitPrice
            };
        }
    }
}
