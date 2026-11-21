using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs
{
    /// <summary>SignalR "DeliveryOrdersChanged": online sipariş geldi (IsNew) ya da durumu değişti. Ekran listeyi yeniler.</summary>
    public class DeliveryOrdersChangedDto
    {
        public Guid Id { get; set; }
        public DeliveryOrderStatus Status { get; set; }
        public bool IsNew { get; set; }
    }
}

namespace RestaurantBill.Application.DTOs.Delivery
{
    // ── Sepet (müşteri gönderir, fiyatı sunucu hesaplar) ────────────────────────────────────────────

    /// <summary>
    /// Sepet satırı. Kind "product": ProductId; Kind "setMenu": SetMenuId + bölüm seçimleri (seçilmeyen bölümde
    /// varsayılan seçenek). Fiyat istemciden alınmaz.
    /// </summary>
    public class CartLineInput
    {
        public const string ProductKind = "product";
        public const string SetMenuKind = "setMenu";

        public string Kind { get; set; } = ProductKind;
        public Guid? ProductId { get; set; }
        public Guid? SetMenuId { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public List<CartSelectionInput> Selections { get; set; } = [];

        public bool IsSetMenu => string.Equals(Kind, SetMenuKind, StringComparison.OrdinalIgnoreCase);
    }

    public class CartSelectionInput
    {
        public Guid SlotId { get; set; }
        public Guid ProductId { get; set; }
    }

    /// <summary>Sunucunun hesapladığı sepet: müşteriye gösterilen tutarlar.</summary>
    public class DeliveryQuoteDto
    {
        public List<DeliveryQuoteLineDto> Lines { get; set; } = [];
        public decimal Subtotal { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal Total { get; set; }
        public Guid? ZoneId { get; set; }
        public string ZoneName { get; set; } = string.Empty;
        public decimal MinOrderAmount { get; set; }
        /// <summary>Ara toplam bölgenin en az sipariş tutarına ulaştı mı.</summary>
        public bool MeetsMinimum { get; set; }
        /// <summary>En az tutara kalan (0: ulaşıldı).</summary>
        public decimal AmountToMinimum { get; set; }
        public int EstimatedMinutes { get; set; }
    }

    public class DeliveryQuoteLineDto
    {
        public string Kind { get; set; } = CartLineInput.ProductKind;
        public Guid? ProductId { get; set; }
        public Guid? SetMenuId { get; set; }
        public string Name { get; set; } = string.Empty;
        /// <summary>Menüde: seçilen ürünler ("Kola +10 ₺" dahil fiyat UnitPrice'tadır).</summary>
        public List<string> Selections { get; set; } = [];
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal LineTotal { get; set; }
        public string Note { get; set; } = string.Empty;
    }

    /// <summary>
    /// Gönderimin sonucu. PriceChanged: istemcinin gördüğü toplam güncel fiyatla tutmadı; sipariş açılmadı, Quote
    /// güncel fiyatlardır (uç 409 döner).
    /// </summary>
    public class SubmitDeliveryOrderResultDto
    {
        public string Token { get; set; } = string.Empty;
        public int Number { get; set; }
        public bool PriceChanged { get; set; }
        public DeliveryQuoteDto? Quote { get; set; }
    }

    // ── Müşteri sitesi: online sipariş sayfası ──────────────────────────────────────────────────────

    public static class OnlineOrderingState
    {
        public const string Open = "open";
        public const string Paused = "paused";
        public const string Closed = "closed";
        public const string Disabled = "disabled";
    }

    public class OnlineOrderingDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string RestaurantPhone { get; set; } = string.Empty;
        /// <summary>open | paused | closed | disabled.</summary>
        public string State { get; set; } = OnlineOrderingState.Disabled;
        public bool IsOpen { get; set; }
        /// <summary>Kapalıyken müşteriye gösterilecek açıklama; açıkken boş.</summary>
        public string Message { get; set; } = string.Empty;
        /// <summary>Bir sonraki sipariş alma başlangıcı (UTC); bilinmiyorsa null.</summary>
        public DateTime? NextOpensAt { get; set; }
        /// <summary>Bugünkü son sipariş saati (UTC); kapalıyken null.</summary>
        public DateTime? LastOrderAt { get; set; }
        public List<DeliveryZoneDto> Zones { get; set; } = [];
        public List<PaymentMethod> PaymentMethods { get; set; } = [];
        /// <summary>PaymentMethods'ta Iban varken ödeme adımında gösterilen IBAN bilgileri; yoksa null.</summary>
        public TableIbanPaymentDto? IbanPayment { get; set; }
        public bool RequiresPhoneVerification { get; set; }
        /// <summary>Müşteri "Gel al"ı seçebilir mi (şube ayarı).</summary>
        public bool PickupEnabled { get; set; }
        /// <summary>Gel al siparişinin yaklaşık hazır olma süresi (dakika).</summary>
        public int PickupEtaMinutes { get; set; }
        /// <summary>Gel al için restoranın adresi (açık adres, ilçe, il); gel al kapalıysa boş.</summary>
        public string PickupAddress { get; set; } = string.Empty;
        /// <summary>Şubenin yol tarifi notu (site bilgileri); boş olabilir.</summary>
        public string PickupDirections { get; set; } = string.Empty;
        public List<OnlineMenuCategoryDto> Categories { get; set; } = [];
        public List<OnlineSetMenuDto> SetMenus { get; set; } = [];
        /// <summary>Şirketin online siparişi açık şubeleri; birden fazlaysa şube seçici gösterilir.</summary>
        public List<OnlineBranchDto> Branches { get; set; } = [];
    }

    public class OnlineBranchDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
    }

    public class OnlineMenuCategoryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<OnlineMenuProductDto> Products { get; set; } = [];
    }

    public class OnlineMenuProductDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        /// <summary>Görsel hazır görsel kütüphanesinden (paylaşılan anahtar): "Temsili görsel" etiketi çıkar.</summary>
        public bool IsStockImage { get; set; }
        public string Description { get; set; } = string.Empty;
        public bool IsFeatured { get; set; }
        /// <summary>"Tükendi": listede görünür ama sepete eklenemez.</summary>
        public bool IsOutOfStock { get; set; }
    }

    public class OnlineSetMenuDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Price { get; set; }
        /// <summary>İndirimsiz fiyat (taban ürünlerin normal fiyatları); Price'tan büyükse menü indirimlidir.</summary>
        public decimal RegularPrice { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        /// <summary>Görsel hazır görsel kütüphanesinden (paylaşılan anahtar): "Temsili görsel" etiketi çıkar.</summary>
        public bool IsStockImage { get; set; }
        public Guid? CategoryId { get; set; }
        /// <summary>Her bölümde seçilebilir en az bir seçenek var mı (yoksa "Tükendi").</summary>
        public bool IsAvailable { get; set; }
        /// <summary>Listed under "Chef's recommendation" alongside featured products.</summary>
        public bool IsFeatured { get; set; }
        public List<OnlineSetMenuSlotDto> Slots { get; set; } = [];
    }

    public class OnlineSetMenuSlotDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsFixed { get; set; }
        public List<OnlineSetMenuOptionDto> Options { get; set; } = [];
    }

    public class OnlineSetMenuOptionDto
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal Surcharge { get; set; }
        public bool IsDefault { get; set; }
        /// <summary>Ürün pasif ya da tükendi ise seçilemez.</summary>
        public bool IsAvailable { get; set; }
    }

    // ── Müşteri: takip sayfası ──────────────────────────────────────────────────────────────────────

    public class DeliveryTrackingDto
    {
        public int Number { get; set; }
        public DeliveryOrderStatus Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        public string StatusDescription { get; set; } = string.Empty;
        /// <summary>Gel al siparişi: takip adımlarında "Yolda" yoktur, restoranın adresi gösterilir.</summary>
        public bool IsPickup { get; set; }
        /// <summary>Gel al siparişinde restoranın adresi; adrese teslimde boş.</summary>
        public string PickupAddress { get; set; } = string.Empty;
        /// <summary>"Ahmet Y."</summary>
        public string CustomerName { get; set; } = string.Empty;
        /// <summary>"0532 *** ** 67"</summary>
        public string CustomerPhone { get; set; } = string.Empty;
        public string ZoneName { get; set; } = string.Empty;
        public PaymentMethod PaymentPreference { get; set; }
        /// <summary>IBAN tercihli, iptal/ret olmamış siparişte havale bilgileri (tutar Total, açıklama sipariş numarası); yoksa null.</summary>
        public TableIbanPaymentDto? IbanPayment { get; set; }
        public List<DeliveryLineDto> Lines { get; set; } = [];
        public decimal Subtotal { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal Total { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? EstimatedMinutes { get; set; }
        /// <summary>Kabul anı + tahmini süre (UTC).</summary>
        public DateTime? EstimatedDeliveryAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        /// <summary>Kuryenin yola çıktığı an (UTC).</summary>
        public DateTime? DispatchedAt { get; set; }
        /// <summary>Yalnızca sipariş yoldayken ve yalnızca ilk ad ("Kaan"); soyad, telefon gösterilmez.</summary>
        public string CourierFirstName { get; set; } = string.Empty;
        public string RejectReason { get; set; } = string.Empty;
        public string CancelReason { get; set; } = string.Empty;
        /// <summary>Müşteri iptal edebilir mi (yalnızca restoran onaylamadan önce).</summary>
        public bool CanCancel { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string RestaurantPhone { get; set; } = string.Empty;
        // Takip sayfasının markası (restoran sitesiyle aynı): şirket adı, vurgu rengi ("#RRGGBB" ya da boş), kapak görseli.
        public string CompanyName { get; set; } = string.Empty;
        public string AccentColor { get; set; } = string.Empty;
        /// <summary>Sitenin hazır renk teması (SiteContent.ThemeKeys); boş = varsayılan.</summary>
        public string Theme { get; set; } = string.Empty;
        /// <summary>Sitenin tasarımı (SiteContent.DesignKeys: "renkli", "sade", "elit", "sicak", "meyhane", "esnaf", "bahce"); boş = varsayılan (renkli).</summary>
        public string Design { get; set; } = string.Empty;
        /// <summary>Sitenin yazı tipi çifti (SiteContent.FontKeys); boş = tasarımın kendi yazı tipi.</summary>
        public string Font { get; set; } = string.Empty;
        public string CoverImageUrl { get; set; } = string.Empty;
        /// <summary>Restoranın onayladığı an (UTC); adım saatleri için.</summary>
        public DateTime? AcceptedAt { get; set; }
    }

    public class DeliveryLineDto
    {
        public DeliveryOrderLineKind Kind { get; set; }
        public Guid? ProductId { get; set; }
        public Guid? SetMenuId { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal LineTotal { get; set; }
        public string Note { get; set; } = string.Empty;
        /// <summary>Menü satırında seçilen ürünlerin adları.</summary>
        public List<string> Selections { get; set; } = [];
    }

    // ── Müşteri: telefon doğrulama ──────────────────────────────────────────────────────────────────

    public class PhoneVerificationSentDto
    {
        /// <summary>Kodun geçerlilik süresi (saniye).</summary>
        public int ExpiresInSeconds { get; set; }
        /// <summary>Yeni kod istenebilmesi için beklenecek süre (saniye).</summary>
        public int ResendAfterSeconds { get; set; }
    }

    public class PhoneVerifiedDto
    {
        /// <summary>Sipariş gönderilirken verilecek tek kullanımlık anahtar.</summary>
        public string VerificationToken { get; set; } = string.Empty;
        public int ExpiresInSeconds { get; set; }
    }

    // ── Personel ────────────────────────────────────────────────────────────────────────────────────

    public class DeliveryOrderDto
    {
        public Guid Id { get; set; }
        public Guid BranchId { get; set; }
        public int Number { get; set; }
        public DeliveryOrderStatus Status { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
        /// <summary>Delivery: adrese teslim; Takeaway: gel al (adres, bölge, kurye yok).</summary>
        public OrderType OrderType { get; set; } = OrderType.Delivery;
        public bool IsPickup { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string AddressDirections { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public Guid? DeliveryZoneId { get; set; }
        public string ZoneName { get; set; } = string.Empty;
        public PaymentMethod PaymentPreference { get; set; }
        public List<DeliveryLineDto> Lines { get; set; } = [];
        public decimal Subtotal { get; set; }
        public decimal DeliveryFee { get; set; }
        public decimal Total { get; set; }
        public Guid? OrderId { get; set; }
        public int? EstimatedMinutes { get; set; }
        /// <summary>Kabulde önerilecek süre: bölgenin süresi, yoksa şube varsayılanı.</summary>
        public int SuggestedEtaMinutes { get; set; }
        public DateTime CreatedAt { get; set; }
        /// <summary>Yanıtlanmazsa otomatik reddedileceği an (yalnızca Received).</summary>
        public DateTime? AutoRejectAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public DateTime? RejectedAt { get; set; }
        public string RejectReason { get; set; } = string.Empty;
        public bool IsAutoRejected { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string CancelReason { get; set; } = string.Empty;
        /// <summary>Müşteri iptali mi (personel iptalinde false).</summary>
        public bool CancelledByCustomer { get; set; }
        public Guid? CourierUserId { get; set; }
        public string? CourierName { get; set; }
        public DateTime? DispatchedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public PaymentMethod? CollectedMethod { get; set; }
        public decimal? CollectedAmount { get; set; }
        public DateTime? SettledAt { get; set; }
        public bool IsPhoneBlocked { get; set; }
    }

    public class CourierSummaryDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        /// <summary>Kuryeye atanmış, teslim edilmemiş siparişler (Accepted…OnTheWay).</summary>
        public int OpenOrderCount { get; set; }
        /// <summary>Yoldaki siparişler.</summary>
        public int OnTheWayCount { get; set; }
        /// <summary>Teslim edilmiş, kasiyerin "Teslim al"ıyla kasaya geçmemiş nakit.</summary>
        public decimal OutstandingCash { get; set; }
        public int OutstandingCashOrderCount { get; set; }
        /// <summary>Teslim edilmiş, kasaya teslim alınmamış nakitsiz tahsilat (kart ve IBAN).</summary>
        public decimal OutstandingCard { get; set; }
        public int OutstandingCardOrderCount { get; set; }
        /// <summary>Önceki iş günlerinde tahsil edilip hâlâ teslim edilmemiş nakit.</summary>
        public decimal PreviousDayCash { get; set; }
        /// <summary>Önceki iş günlerinden kalan (nakit + kart) sipariş sayısı.</summary>
        public int PreviousDayOrderCount { get; set; }
        /// <summary>Teslim edilmemiş en eski tahsilatın zamanı (UTC).</summary>
        public DateTime? OldestCollectedAt { get; set; }
        /// <summary>Teslim alınmayı bekleyen siparişler, teslim sırasıyla (kasiyerin "Teslim al" seçimi).</summary>
        public List<CourierOutstandingOrderDto> OutstandingOrders { get; set; } = [];
    }

    public class OnlineOrderingPauseDto
    {
        public Guid BranchId { get; set; }
        public bool Paused { get; set; }
        /// <summary>Şubenin ayarlarında online sipariş açık mı (kapalıysa durdurma anahtarının etkisi yok).</summary>
        public bool Enabled { get; set; }
    }

    // ── Ayarlar (Owner/Admin) ───────────────────────────────────────────────────────────────────────

    public class OnlineOrderSettingsDto
    {
        public bool Enabled { get; set; }
        public bool Paused { get; set; }
        public List<OnlineOrderDayDto> Days { get; set; } = [];
        public int LastOrderMinutesBeforeClose { get; set; }
        public int DefaultEtaMinutes { get; set; }
        public int AutoRejectAfterMinutes { get; set; }
        public int MaxOpenOrdersPerPhone { get; set; }
        public int MaxOrdersPerPhonePerDay { get; set; }
        public bool AcceptCash { get; set; }
        public bool AcceptCard { get; set; }
        /// <summary>IBAN ile ödeme (havale/EFT) ayarı; şubede geçerli IBAN yoksa müşteriye gösterilmez.</summary>
        public bool AcceptIban { get; set; }
        /// <summary>Şubede müşteriye gösterilebilecek IBAN var mı (Ayarlar → Ödeme).</summary>
        public bool HasIban { get; set; }
        public bool RequirePhoneVerification { get; set; }
        /// <summary>SMS sağlayıcısı yapılandırılmış mı; değilse telefon doğrulaması açık olsa da istenmez.</summary>
        public bool SmsConfigured { get; set; }
        public bool PreOrderEnabled { get; set; }
        public int PreOrderLeadMinutes { get; set; }
        /// <summary>"Gel al": müşteri online sipariş verip restorandan alır (adres ve teslimat ücreti yok).</summary>
        public bool PickupEnabled { get; set; }
        public int PickupEtaMinutes { get; set; }
        /// <summary>Şube hiç kaydetmediyse false (varsayılanlar geçerli).</summary>
        public bool IsCustomized { get; set; }
    }

    public class OnlineOrderDayDto
    {
        /// <summary>DayOfWeek: 0 = Pazar … 6 = Cumartesi.</summary>
        public int Day { get; set; }
        public bool IsOpen { get; set; }
        /// <summary>"HH:mm"</summary>
        public string Opens { get; set; } = string.Empty;
        /// <summary>"HH:mm"; açılıştan küçükse gece yarısını aşar.</summary>
        public string Closes { get; set; } = string.Empty;
    }

    public class DeliveryZoneDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Fee { get; set; }
        public decimal MinOrderAmount { get; set; }
        public int EstimatedMinutes { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
    }

    public class BlockedPhoneDto
    {
        public Guid Id { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string BlockedByName { get; set; } = string.Empty;
        /// <summary>Engel yüzünden geri çevrilen sipariş denemeleri.</summary>
        public int BlockedAttemptCount { get; set; }
        public DateTime? LastBlockedAttemptAt { get; set; }
        /// <summary>Engel panodaki bir siparişten konduysa o siparişin Id'si ve numarası.</summary>
        public Guid? SourceDeliveryOrderId { get; set; }
        public int? SourceDeliveryOrderNumber { get; set; }
    }
}
