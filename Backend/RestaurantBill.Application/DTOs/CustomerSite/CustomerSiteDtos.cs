using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.DTOs.CustomerSite;

public class PublicSiteDto
{
    public string CompanyName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string OpenAddress { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public List<PublicBranchDto> Branches { get; set; } = [];
    public List<PublicCategoryDto> Categories { get; set; } = [];
    /// <summary>Şubenin aktif paket menüleri ("Adana Menü"); online sipariş sayfasıyla aynı biçim.</summary>
    public List<OnlineSetMenuDto> SetMenus { get; set; } = [];
    public List<PublicRegionDto> Regions { get; set; } = [];
    public BranchSiteDto Site { get; set; } = new();
    /// <summary>Şubenin yerel saatiyle şu an açık mı (haftalık saat varsa ona göre); saat girilmemişse null.</summary>
    public bool? IsOpenNow { get; set; }
    /// <summary>Şubenin yerel saatiyle bugün: 0 Pazar … 6 Cumartesi (haftalık saat tablosunda "bugün" vurgusu).</summary>
    public int Today { get; set; }
    /// <summary>Sitenin rezervasyon arayüzünün ihtiyaç duyduğu kurallar.</summary>
    public ReservationRulesDto Reservation { get; set; } = new();
    /// <summary>Ana sayfanın geçerli başlık/açıklama/görseli (document.title için). Alt sayfa başlığı: "Menü · {ad}".</summary>
    public SiteSeoDto Seo { get; set; } = new();
}

// Şubenin rezervasyon ayarları. Müşteri sitesi ve admin "Rezervasyon ayarları" aynı şekli kullanır.
public class ReservationRulesDto
{
    public bool Enabled { get; set; }
    public int SlotIntervalMinutes { get; set; }
    public int DurationMinutes { get; set; }
    public int MaxDaysAhead { get; set; }
    public int MaxPartySize { get; set; }
    /// <summary>Pazartesi → Pazar; Day: 0 Pazar … 6 Cumartesi (JS Date.getDay ile aynı).</summary>
    public List<ReservationDayDto> Days { get; set; } = [];
    /// <summary>false: şubede hiç kaydedilmemiş, değerler varsayılan (açılış/kapanış saatinden türetilir).</summary>
    public bool IsCustomized { get; set; }

    public static ReservationRulesDto From(Branch branch)
    {
        ReservationSettings settings = branch.GetReservationSettings();
        return new ReservationRulesDto
        {
            Enabled = settings.Enabled,
            SlotIntervalMinutes = settings.SlotIntervalMinutes,
            DurationMinutes = settings.DurationMinutes,
            MaxDaysAhead = settings.MaxDaysAhead,
            MaxPartySize = settings.MaxPartySize,
            Days = settings.Days.Select(ReservationDayDto.From).ToList(),
            IsCustomized = branch.ReservationSettings is not null,
        };
    }
}

public class ReservationDayDto
{
    public int Day { get; set; }
    public bool IsOpen { get; set; }
    /// <summary>"HH:mm"</summary>
    public string FirstStart { get; set; } = string.Empty;
    public string LastStart { get; set; } = string.Empty;

    public static ReservationDayDto From(ReservationDayHours hours) => new()
    {
        Day = (int)hours.Day,
        IsOpen = hours.IsOpen,
        FirstStart = hours.FirstStart.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture),
        LastStart = hours.LastStart.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture),
    };
}

public class PublicBranchDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class PublicCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<PublicProductDto> Products { get; set; } = [];
}

public class PublicProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    /// <summary>Görsel hazır görsel kütüphanesinden (paylaşılan anahtar): sitede "Temsili görsel" etiketi çıkar.</summary>
    public bool IsStockImage { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    /// <summary>Tahmini hazırlanma süresi (dk); null ise gösterilmez.</summary>
    public int? PrepMinutes { get; set; }
    /// <summary>"Tükendi": menüde görünür, masadan sipariş edilemez.</summary>
    public bool IsOutOfStock { get; set; }
}

// BranchSiteDto (şubenin site içeriği) ve ek site alanlarının DTO'ları: SiteContentDtos.cs.

public class PublicRegionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<PublicTableDto> Tables { get; set; } = [];
    /// <summary>Bölümün sitedeki fotoğrafı (tam adres) ve kısa açıklaması; girilmemişse boş.</summary>
    public string PhotoUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class PublicTableDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>En fazla kaç kişi; girilmemişse null.</summary>
    public int? Capacity { get; set; }
}

public class PublicTableInfoDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    /// <summary>Karşılama ekranında hangi düğmelerin görüneceği (admin anahtarları).</summary>
    public QrFeaturesDto QrFeatures { get; set; } = new();
    /// <summary>Şube şu an online paket sipariş alıyor mu (ayarda açık ve durdurulmamış; saat kontrolü hariç).</summary>
    public bool AcceptsOnlineOrders { get; set; }
    /// <summary>"IBAN ile öde" penceresinin bilgileri; restoran açmadıysa ya da IBAN geçerli değilse null (hiç gönderilmez).</summary>
    public TableIbanPaymentDto? IbanPayment { get; set; }
    /// <summary>
    /// Masa QR'ında bu telefonun durumu (X-Device-Token): "none" masa kimseye bağlı değil, "mine" bu telefona bağlı,
    /// "other" başka bir telefondan sipariş veriliyor (sepet kapalı). Sayfayı açmak masayı kilitlemez.
    /// </summary>
    public string OrderLock { get; set; } = "none";
    /// <summary>
    /// "Popüler" bölümünün ürünleri, çok satandan aza (en çok 8). Bölüm kapalıysa ya da son 30 günde yeterli satış yoksa
    /// (3 üründen az) boş: bölüm gösterilmez.
    /// </summary>
    public List<Guid> PopularProductIds { get; set; } = [];
}

// "IBAN ile öde" bilgileri: masa QR sayfası ve online paket sipariş (ödeme adımı ve takip sayfası). Misafir IBAN'ı
// kopyalar, ödemeyi yapar, dekontu WhatsApp'tan restorana gönderir.
public class TableIbanPaymentDto
{
    /// <summary>Boşluksuz "TR..." (kopyalanan değer).</summary>
    public string Iban { get; set; } = string.Empty;
    /// <summary>"TR33 0006 ..." (ekranda gösterilen).</summary>
    public string IbanFormatted { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;
    /// <summary>Boş olabilir.</summary>
    public string BankName { get; set; } = string.Empty;
    /// <summary>Dekontun gönderileceği WhatsApp numarası: sitenin WhatsApp'ı, yoksa cep telefonuysa şube telefonu; ikisi de yoksa boş.</summary>
    public string WhatsappPhone { get; set; } = string.Empty;
    /// <summary>Gösterilen ve "Ara" ile aranan numara: WhatsApp numarası, yoksa şube telefonu; boş olabilir.</summary>
    public string Phone { get; set; } = string.Empty;

    /// <summary>Masa QR'ı: gösterim kapalıysa ya da IBAN geçersizse null.</summary>
    public static TableIbanPaymentDto? From(Branch branch) => branch.ShowsIbanOnTable ? ForPayment(branch) : null;

    /// <summary>Şubenin IBAN bilgileri (anahtarlara bakılmaz); geçerli IBAN ya da hesap sahibi yoksa null.</summary>
    public static TableIbanPaymentDto? ForPayment(Branch branch)
    {
        if (!branch.HasPayableIban) return null;

        string sitePhone = branch.GetSiteContent().WhatsappPhone.Trim();
        string branchPhone = branch.Number.Trim();
        string whatsapp = sitePhone.Length > 0 ? sitePhone
            : IsTurkishMobile(branchPhone) ? branchPhone
            : string.Empty;

        return new TableIbanPaymentDto
        {
            Iban = branch.Iban,
            IbanFormatted = TurkishIban.Format(branch.Iban),
            AccountHolder = branch.IbanHolderName,
            BankName = branch.PaymentBankName,
            WhatsappPhone = whatsapp,
            Phone = whatsapp.Length > 0 ? whatsapp : branchPhone,
        };
    }

    /// <summary>Türkiye cep numarası: 05xx / +90 5xx / 5xx (10 hane, 5 ile başlar). Sabit hatta WhatsApp olmaz.</summary>
    public static bool IsTurkishMobile(string? phone)
    {
        string normalized = TurkishPhone.Normalize(phone);
        return normalized.Length == TurkishPhone.NormalizedLength && normalized[3] == '5';
    }
}

// Masa QR karşılama ekranının anahtarları. Admin "QR menü özellikleri" ve müşteri sayfası aynı şekli kullanır.
public class QrFeaturesDto
{
    public bool OrderingEnabled { get; set; } = true;
    public bool CallWaiterEnabled { get; set; } = true;
    public bool BillRequestEnabled { get; set; } = true;
    public bool DeliveryLinkEnabled { get; set; } = true;
    public bool ReservationLinkEnabled { get; set; } = true;
    /// <summary>Menü başındaki "Öne Çıkanlar" bölümü.</summary>
    public bool FeaturedSectionEnabled { get; set; } = true;
    /// <summary>"Popüler" bölümü (son 30 günün en çok satanları); varsayılan kapalı.</summary>
    public bool PopularSectionEnabled { get; set; }

    public static QrFeaturesDto From(QrFeatures features) => new()
    {
        OrderingEnabled = features.OrderingEnabled,
        CallWaiterEnabled = features.CallWaiterEnabled,
        BillRequestEnabled = features.BillRequestEnabled,
        DeliveryLinkEnabled = features.DeliveryLinkEnabled,
        ReservationLinkEnabled = features.ReservationLinkEnabled,
        FeaturedSectionEnabled = features.FeaturedSectionEnabled,
        PopularSectionEnabled = features.PopularSectionEnabled,
    };
}

/// <summary>"Garson çağır" / "Hesap iste" sonucu. Sent=false: aynı istek az önce yapılmış, yeniden bildirilmedi.</summary>
public class TableActionResultDto
{
    public bool Sent { get; set; }
    /// <summary>Bu masadan aynı istek kaç saniye sonra tekrar yapılabilir.</summary>
    public int RetryAfterSeconds { get; set; }
    /// <summary>Yalnız "Hesap iste" ve yalnız hesabın bağlı olduğu telefonda: ödenecek kalan; diğer durumlarda null.</summary>
    public decimal? BillTotal { get; set; }
}

/// <summary>Masanın açık hesabı; yalnız hesabın bağlı olduğu telefona (QrTableLock) döner.</summary>
public class PublicTableBillDto
{
    /// <summary>false: telefon masayı ilk talebiyle tuttu ama garson henüz onaylamadı; hesap yok ya da gösterilmez.</summary>
    public bool HasBill { get; set; }
    public List<PublicTableBillLineDto> Items { get; set; } = [];
    public decimal Total { get; set; }
    /// <summary>Açık hesapta tutar girerek alınmış ödemeler; ödenen hesapta tahsil edilen toplam (iskonto düşülmüş).</summary>
    public decimal Paid { get; set; }
    public decimal Remaining { get; set; }
    public DateTime? BillRequestedAt { get; set; }
    /// <summary>true: hesap ödenip kapandı; kalemler ödeme kayıtlarından gelir, kalan 0.</summary>
    public bool IsPaid { get; set; }
    /// <summary>
    /// Bu telefonun masadaki son ödenen hesabının kapanış anı (UTC); yoksa null. Açık hesapta da dolu olabilir (önceki
    /// hesap): telefon bu andan önce onaylanan taleplerini "Ödendi" gösterir.
    /// </summary>
    public DateTime? PaidAt { get; set; }
    /// <summary>Ödenen hesapta uygulanan iskonto toplamı.</summary>
    public decimal Discount { get; set; }
}

public class PublicTableBillLineDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    /// <summary>Menü satırının içindeki ürünler ("Adana", "Ayran").</summary>
    public List<string> Details { get; set; } = [];
    public string Note { get; set; } = string.Empty;
    /// <summary>Paket kalem ("Paket olsun").</summary>
    public bool IsTakeaway { get; set; }
}

public class AvailabilityDto
{
    public List<Guid> UnavailableTableIds { get; set; } = [];
}

public class OrderRequestStatusDto
{
    public Guid Id { get; set; }
    public int Status { get; set; }
    /// <summary>Reddedildiyse garsonun müşteriye yazdığı neden; boş olabilir.</summary>
    public string RejectReason { get; set; } = string.Empty;
}

// Eski GET reservations/{id} ucu için; kimlik artık döndürülmez (rezervasyon bağlantısı token'la açılır).
public class ReservationStatusDto
{
    public int Status { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int PartySize { get; set; }
}

public class OrderRequestDto
{
    public Guid Id { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public decimal Total { get; set; }
    public List<OrderRequestItemDto> Items { get; set; } = [];
}

public class OrderRequestItemDto
{
    /// <summary>"product" ya da "setMenu" (CartLineInput.ProductKind / SetMenuKind).</summary>
    public string Kind { get; set; } = "product";
    public Guid? ProductId { get; set; }
    public Guid? SetMenuId { get; set; }
    /// <summary>Ürünün ya da menünün adı.</summary>
    public string ProductName { get; set; } = string.Empty;
    /// <summary>Menü kaleminde seçilen ürünlerin adları (seçimli bölümler; ek ücret varsa "(+₺10)"); ürün kaleminde boş.</summary>
    public List<string> Selections { get; set; } = [];
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Note { get; set; } = string.Empty;
    /// <summary>Müşteri QR'da "Paket olsun" dedi.</summary>
    public bool IsTakeaway { get; set; }
}

public class StaffReservationDto
{
    public Guid Id { get; set; }
    /// <summary>Kısa kod, "K7M-2QP": personel telefonda müşteriye okur.</summary>
    public string Code { get; set; } = string.Empty;
    /// <summary>Müşterinin rezervasyon bağlantısının (/rezervasyon/:token) anahtarı: "Bağlantıyı kopyala" / WhatsApp.</summary>
    public string AccessToken { get; set; } = string.Empty;
    /// <summary>Restoranın alt alan adı: bağlantı https://{siteSlug}.sophram.com/rezervasyon/{accessToken} olur.</summary>
    public string SiteSlug { get; set; } = string.Empty;
    public int Status { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public int PartySize { get; set; }
    // Şubenin saat diliminde: "2026-11-14", "19:30", "21:30".
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public DateTime StartsAtUtc { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>Rezervasyonun son ön siparişi (bekleyen, iptal ya da süresi dolmuş); hiç yoksa null.</summary>
    public StaffPreOrderDto? PreOrder { get; set; }
    /// <summary>Masada ödenmemiş bir hesap var: "Geldi" ön siparişi bu hesaba ekler.</summary>
    public bool TableHasOpenOrder { get; set; }
}

public class StaffPreOrderDto
{
    /// <summary>OrderRequestStatus: 1 bekliyor (mutfağa gitmedi), 2 mutfağa gönderildi, 4 iptal, 5 süresi doldu.</summary>
    public int Status { get; set; }
    public string Note { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<OrderRequestItemDto> Items { get; set; } = [];
}

// ── Rezervasyon bağlantısı (/rezervasyon/:token) ────────────────────────────────────────────────

/// <summary>Rezervasyon talebi gönderildi: müşteriye verilen bağlantının gizli anahtarıyla.</summary>
public class ReservationCreatedDto : ReservationStatusDto
{
    public string AccessToken { get; set; } = string.Empty;
    /// <summary>"K7M-2QP": müşteri bu kod ve telefonuyla rezervasyonunu sorgulayabilir.</summary>
    public string Code { get; set; } = string.Empty;
}

/// <summary>"Rezervasyon sorgula" başarılı: istemci /rezervasyon/{accessToken} sayfasına gider.</summary>
public class ReservationLookupResultDto
{
    public string AccessToken { get; set; } = string.Empty;
}

public class ReservationDetailDto
{
    /// <summary>"K7M-2QP".</summary>
    public string Code { get; set; } = string.Empty;
    public int Status { get; set; }
    /// <summary>"Ahmet Y." — ad ve soyadın baş harfi.</summary>
    public string GuestName { get; set; } = string.Empty;
    public string TableName { get; set; } = string.Empty;
    public int PartySize { get; set; }
    // Şubenin yerel saatiyle.
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public DateTime StartsAtUtc { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string RestaurantPhone { get; set; } = string.Empty;
    /// <summary>Menü için: GET api/public/site?branchId=…</summary>
    public Guid BranchId { get; set; }
    public PreOrderWindowDto PreOrderWindow { get; set; } = new();
    public PublicPreOrderDto? PreOrder { get; set; }
    /// <summary>Şu an tükenmiş ürünler; menüde eklenemez.</summary>
    public List<Guid> OutOfStockProductIds { get; set; } = [];
    /// <summary>Misafir rezervasyonu kendisi iptal edebilir mi (bekliyor/onaylı ve son iptal anı geçmemiş).</summary>
    public bool CanCancel { get; set; }
    /// <summary>Misafirin online iptal edebileceği son an (UTC): rezervasyondan 2 saat önce.</summary>
    public DateTime CancelDeadline { get; set; }
}

public class PreOrderWindowDto
{
    /// <summary>Şubede ön sipariş açık mı.</summary>
    public bool Enabled { get; set; }
    public DateTime OpensAt { get; set; }
    public DateTime ClosesAt { get; set; }
    /// <summary>Şubenin yerel saatiyle "HH:mm".</summary>
    public string OpensAtTime { get; set; } = string.Empty;
    public string ClosesAtTime { get; set; } = string.Empty;
    public bool CanPreOrder { get; set; }
    /// <summary>Verilemiyorsa müşteriye gösterilecek neden.</summary>
    public string? Reason { get; set; }
}

public class PublicPreOrderDto
{
    /// <summary>OrderRequestStatus: 1 alındı (masaya oturunca mutfağa gider), 2 mutfağa gönderildi, 4 iptal, 5 süresi doldu.</summary>
    public int Status { get; set; }
    public string Note { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public List<OrderRequestItemDto> Items { get; set; } = [];
    public bool CanEdit { get; set; }
    public bool CanCancel { get; set; }
}

public class DaySlotDto
{
    /// <summary>Şubenin yerel saatiyle "HH:mm".</summary>
    public string Time { get; set; } = string.Empty;
    /// <summary>Bu saatte boş masa kalmadı.</summary>
    public bool Full { get; set; }
}
