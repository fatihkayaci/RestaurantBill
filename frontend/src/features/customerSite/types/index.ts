import type { OnlineSetMenu } from '@/features/delivery/types';

export interface PublicProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    /** Görsel hazır görsel kütüphanesinden: "Temsili görsel" etiketi gösterilir. */
    isStockImage: boolean;
    description: string;
    isFeatured: boolean;
    /** Admin'in "Yeni" etiketi (30 gün); eski sunucuda yok. */
    isNew?: boolean;
    /** Tahmini hazırlanma süresi (dk); null ise gösterilmez. */
    prepMinutes: number | null;
    /** "Tükendi": menüde görünür, masadan sipariş edilemez. */
    isOutOfStock: boolean;
    /** Alerjen bayrakları (features/products/dietaryTags: ALLERGENS); eski sunucu: yok. */
    allergens?: number;
    /** Diyet / bilgi etiketleri (DIET_TAGS: vegan, vejetaryen, glutensiz, helal, acılı); eski sunucu: yok. */
    dietTags?: number;
}

/** Şubenin site içeriği; admin "Restoran sitesi" sayfası da aynı şekli kullanır. Boş alanın bölümü çizilmez. */
export interface BranchSite {
    headline: string;
    tagline: string;
    /** "Hikâyemiz" bölümünün büyük başlığı. */
    storyTitle: string;
    about: string;
    coverImageUrl: string;
    aboutImageUrl: string;
    /** Restoran logosu (QR menü başlığı, fotoğrafsız ürünlerin yer tutucusu); boş = yok. Eski sunucu göndermezse de boş. */
    logoUrl?: string;
    /** "HH:mm" ya da null */
    opensAt: string | null;
    closesAt: string | null;
    hoursNote: string;
    instagramUrl: string;
    /** "#RRGGBB" ya da boş */
    accentColor: string;
    /** Hazır renk teması (tasarımın temalarından biri; Renkli'de vurgu + kapak, Sade'de yalnız vurgu); boş = varsayılan. */
    theme: string;
    /** Sitenin tasarımı (SITE_DESIGN_KEYS); boş = varsayılan (Sophra). */
    design?: string;
    /** Anasayfa bölümlerinin sırası ve görünürlüğü (HOME_SECTION_KEYS); boş = varsayılan sıra, hepsi açık. Yalnız bölüm
     *  düzenini kullanan tasarım (Sophra) okur. */
    homeSections: SiteHomeSection[];
    /** Yazı tipi çifti (SITE_FONTS anahtarı, ör. "playfair-inter"); boş = tasarımın kendi yazı tipi. */
    font?: string;
    /** Mekân fotoğrafları, sitedeki sırayla (en çok 12). */
    galleryImageUrls: string[];
    /** Boş: "her gün aynı" (opensAt/closesAt). Doluysa Pazartesi → Pazar 7 gün. */
    weeklyHours: SiteDayHours[];
    /** "Nasıl gelinir" kısa metni. */
    directionsNote: string;
    whatsappPhone: string;
    /** SITE_AMENITIES anahtarları. */
    amenities: string[];
    /** Sitede gizlenen hazır "Sık sorulanlar" anahtarları (site/siteFaqs.ts); boş = hepsi görünür. */
    hiddenFaqs: string[];
    rating: number | null;
    reviewCount: number | null;
    /** Google Haritalar yorum sayfası. */
    reviewsUrl: string;
    featuredReviews: SiteReview[];
    founderPhotoUrl: string;
    founderName: string;
    founderTitle: string;
    founderQuote: string;
    foundedYear: number | null;
    values: SiteValue[];
    milestones: SiteMilestone[];
    /** Hakkımızda'daki "Ekibimiz" üyeleri, sitedeki sırayla (en çok 6). Adı boş üye (fotoğrafı korunmuş) sitede çizilmez. */
    teamMembers: SiteTeamMember[];
    /** "Ekibimiz" başlığı; boş = tasarımın varsayılanı. */
    teamTitle: string;
    /** "Ekibimiz" giriş cümlesi; boş = tasarımın varsayılanı. */
    teamIntro: string;
    /** Yalnız admin: şubenin bütün bölümleri (sitede bu bilgi regions[] içinde). */
    regionDetails: SiteRegionDetail[];
    /** Google/paylaşım başlığı; boş = otomatik ("Ad · ilçe"). */
    seoTitle: string;
    /** Google/paylaşım açıklaması; boş = otomatik. */
    seoDescription: string;
    /** Seçilen paylaşım görseli; boş = kapak (otomatik). */
    shareImageUrl: string;
    /** Alt sayfaların kendi kapakları; boş = sitenin kapağı (Mekân'da galeri → hikâye → kapak). */
    menuHeroUrl: string;
    aboutHeroUrl: string;
    venueHeroUrl: string;
    contactHeroUrl: string;
    reservationHeroUrl: string;
}

/** Sitenin geçerli Google/paylaşım değerleri (girilmemişse otomatik olanlar). */
export interface SiteSeo {
    title: string;
    description: string;
    shareImageUrl: string;
}

// ── Görsel site düzenleyicisi (docs/site-editor.md) ─────────────────────────────────────────────

export interface SiteChange {
    /** "coverImage", "tagline", "values", "region:{id}"… */
    field: string;
    label: string;
    /** "Anasayfa", "Hakkımızda", "Mekân", "İletişim", "Tema", "Google ve paylaşım". */
    page: string;
}

export interface SiteEditorSeo extends SiteSeo {
    autoTitle: string;
    autoDescription: string;
    autoShareImageUrl: string;
    titleIsAuto: boolean;
    descriptionIsAuto: boolean;
    shareImageIsAuto: boolean;
    /** { "/menu": "Menü · Ocak", … } */
    pageTitles: Record<string, string>;
}

/** GET api/company/site/draft (şirket geneli site, yalnız sahip): taslak, yayındaki, değişen alanlar ve sürüm. */
export interface SiteEditor {
    version: number;
    hasChanges: boolean;
    changes: SiteChange[];
    draftUpdatedAt: string | null;
    publishedAt: string | null;
    draft: BranchSite;
    published: BranchSite;
    seo: SiteEditorSeo;
    /** "https://ocak.sophram.com"; slug yoksa boş. */
    siteUrl: string;
}

/** Haftalık saatin bir günü. day: 0 Pazar … 6 Cumartesi. Kapanış açılıştan önceyse gece yarısını aşar. */
export interface SiteDayHours {
    day: number;
    isOpen: boolean;
    /** "HH:mm" */
    opens: string;
    closes: string;
}

/** "Ekibimiz" üyesi: ustayla birlikte çalışan biri. Fotoğraf kimliğe bağlıdır (sıra değişse de kişide kalır). */
export interface SiteTeamMember {
    id: string;
    name: string;
    /** "Mutfak şefi"; boş olabilir. */
    role: string;
    /** İsteğe bağlı tek satır not. */
    note: string;
    /** Kendi yüklenmiş portre (hazır görsel yok); boş = baş harfler. */
    photoUrl: string;
}

/** Anasayfanın bir bölümü: "categories" | "featured" | "about" | "team" | "features" | "gallery" | "reviews" | "contact". */
export interface SiteHomeSection {
    key: string;
    enabled: boolean;
}

export interface SiteReview {
    author: string;
    text: string;
    /** "Google", "Tripadvisor"… */
    source: string;
}

export interface SiteValue {
    title: string;
    text: string;
}

export interface SiteMilestone {
    year: number;
    text: string;
}

export interface SiteRegionDetail {
    regionId: string;
    name: string;
    tableCount: number;
    photoUrl: string;
    description: string;
}

/** "Sitenizi güzelleştirin": doluluk puanı ve görsel etkisine göre sıralı yapılacaklar. */
export interface SiteCompleteness {
    score: number;
    totalProducts: number;
    productsWithoutPhoto: number;
    items: SiteChecklistItem[];
}

export interface SiteChecklistItem {
    /** "cover", "gallery", "productPhotos", "story", "hours"… */
    key: string;
    title: string;
    reason: string;
    done: boolean;
    weight: number;
    /** 0–1 */
    progress: number;
    detail: string;
}

export interface PublicCategory {
    id: string;
    name: string;
    /** Müşteri menüsündeki görünüm ("auto" | "cards" | "list"); eski sunucuda yok: otomatik. */
    menuDisplay?: 'auto' | 'cards' | 'list';
    /** Kategorinin servis penceresine göre şu an sipariş edilebilir mi (şubenin saatiyle); eski sunucu: yok, açık say. */
    availableNow?: boolean;
    /** "12:00'ye kadar", "18:00'den itibaren", "Hafta içi 08:00–12:00"; pencere yoksa boş. */
    availabilityLabel?: string;
    products: PublicProduct[];
}

export interface PublicTable {
    id: string;
    name: string;
    /** En fazla kaç kişi; girilmemişse null. */
    capacity?: number | null;
}

export interface PublicRegion {
    id: string;
    name: string;
    tables: PublicTable[];
    /** Bölümün sitedeki fotoğrafı ve kısa açıklaması; girilmemişse boş. */
    photoUrl?: string;
    description?: string;
}

export interface PublicSite {
    companyName: string;
    branchId: string;
    branchName: string;
    city: string;
    district: string;
    openAddress: string;
    phone: string;
    branches: { id: string; name: string }[];
    categories: PublicCategory[];
    /** Aktif paket menüler; online sipariş sayfasıyla aynı biçim (pasif ürünün seçeneği listelenmez). */
    setMenus: OnlineSetMenu[];
    regions: PublicRegion[];
    site: BranchSite;
    /** Şubenin yerel saatine göre (haftalık saat varsa ona göre); saat girilmemişse null. */
    isOpenNow: boolean | null;
    /** Şubenin yerel saatiyle bugün: 0 Pazar … 6 Cumartesi. */
    today?: number;
    reservation: ReservationRules;
    /** Yayındaki geçerli Google/paylaşım değerleri; eski sunucuda yok. */
    seo?: SiteSeo;
}

/** Bir günün rezervasyon başlangıç aralığı. day: 0 Pazar … 6 Cumartesi (Date.getDay ile aynı). */
export interface ReservationDay {
    day: number;
    isOpen: boolean;
    /** "HH:mm" */
    firstStart: string;
    lastStart: string;
}

/** Şubenin rezervasyon kuralları; müşteri sitesi ve admin ayar penceresi aynı şekli kullanır. */
export interface ReservationRules {
    enabled: boolean;
    slotIntervalMinutes: number;
    /** Masada kalma süresi (dk). */
    durationMinutes: number;
    maxDaysAhead: number;
    maxPartySize: number;
    /** Pazartesi → Pazar. */
    days: ReservationDay[];
    /** false: hiç kaydedilmemiş, değerler varsayılan. */
    isCustomized: boolean;
}

/** Sitede rezervasyon arayüzü gösterilsin mi: açık, en az bir gün açık ve masa var. */
export function canReserveOnline(site: PublicSite): boolean {
    return site.reservation.enabled && site.reservation.days.some(d => d.isOpen) && site.regions.length > 0;
}

/** Bir tarihin ("2026-11-14") haftanın günü rezervasyona açık mı. */
export function isReservationDayOpen(rules: ReservationRules, date: string): boolean {
    const [year, month, day] = date.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    return rules.days.find(d => d.day === weekday)?.isOpen ?? true;
}

/** 120 → "2 saat", 90 → "1,5 saat", 150 → "2,5 saat". */
export function formatDuration(minutes: number): string {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} saat`;
}

export interface PublicTableInfo {
    id: string;
    name: string;
    regionName: string;
    branchId: string;
    /** Karşılama ekranında hangi düğmelerin görüneceği (admin anahtarları). */
    qrFeatures: QrFeatures;
    /** Şube şu an online paket sipariş alıyor mu (ayarda açık ve durdurulmamış). */
    acceptsOnlineOrders: boolean;
    /**
     * Personel bu masada QR'dan siparişi kilitledi: menü, garson çağırma, hesap isteme ve hesap açık; sepet ve gönderim
     * kapalı (sunucu da reddeder). Eski sunucu göndermezse açık sayılır.
     */
    qrOrderingLocked?: boolean;
    /**
     * "Popüler" bölümünün ürün kimlikleri, çok satandan aza (en çok 8). Bölüm kapalıysa ya da yeterli satış yoksa boş;
     * eski sunucu göndermez.
     */
    popularProductIds?: string[];
}

/** Personel masada QR siparişini kilitlediğinde gösterilen mesaj (sunucunun reddiyle aynı metin). */
export const TABLE_QR_LOCKED_MESSAGE = 'Bu masada QR ile sipariş şu an kapalı. Siparişinizi garsonumuza verebilirsiniz.';

/**
 * "Masanın hesabı": açık hesabın kalemleri (garsonun ekledikleri ve menüler dahil). Açık hesap masadaki her telefonda
 * görünür; ödenen hesap yalnız ona sipariş veren telefonlarda bir süre.
 */
export interface PublicTableBill {
    /** false: masada açık hesap yok (ya da bu telefonun görebileceği ödenen hesap yok). */
    hasBill: boolean;
    items: PublicTableBillLine[];
    total: number;
    paid: number;
    remaining: number;
    billRequestedAt: string | null;
    /** true: hesap ödenip kapandı; kalemler ödenenlerdir, kalan 0. Sunucu bunu yalnız hesaba sipariş veren telefonlara bir süre gösterir. */
    isPaid: boolean;
    /** Bu telefonun masadaki son ödenen hesabının kapanış anı; açık hesapta önceki hesabınki olabilir, yoksa null. */
    paidAt: string | null;
    /** Ödenen hesapta uygulanan iskonto. */
    discount: number;
    /** Personel masada QR siparişini kilitledi (yoklamada güncellenir); eski sunucu göndermez. */
    qrOrderingLocked?: boolean;
    /**
     * Masadan gönderilip garson onayı bekleyen QR siparişleri (yalnız bilgi: zaman ve adet, ürün adı yok). Açık hesap
     * varken ya da son 30 dakikada gönderildiyse gelir; isMine bu telefonunki. Eski sunucu: yok.
     */
    pendingRequests?: PublicPendingRequest[];
}

export interface PublicPendingRequest {
    sentAt: string;
    itemCount: number;
    isMine: boolean;
}

export interface PublicTableBillLine {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    /** Menü satırının içindeki ürünler. */
    details: string[];
    note: string;
    /** "Paket olsun" denen kalem (eski sunucu: yok). */
    isTakeaway?: boolean;
}

/** Masa QR karşılama ekranının anahtarları; admin "QR menü özellikleri" de aynı şekli kullanır. */
export interface QrFeatures {
    orderingEnabled: boolean;
    callWaiterEnabled: boolean;
    billRequestEnabled: boolean;
    deliveryLinkEnabled: boolean;
    reservationLinkEnabled: boolean;
    /** Menü başındaki "Öne Çıkanlar" bölümü; eski sunucu göndermezse açık sayılır. */
    featuredSectionEnabled?: boolean;
    /** "Popüler" bölümü (son 30 günün en çok satanları); eski sunucu göndermezse kapalı. */
    popularSectionEnabled?: boolean;
}

/** "Garson çağır" / "Hesap iste" sonucu. sent=false: bu masadan az önce yapılmış, yeniden bildirilmedi. */
export interface TableActionResult {
    sent: boolean;
    retryAfterSeconds: number;
    /** Yalnız "Hesap iste"de: masanın açık hesabında ödenecek kalan. */
    billTotal?: number | null;
}

export interface Availability {
    unavailableTableIds: string[];
}

/** Bir günün rezervasyon başlangıcı (şubenin aralığıyla); full: boş masa kalmadı. */
export interface DaySlot {
    time: string;
    full: boolean;
}

// Backend OrderRequestStatus: 1 bekliyor, 2 onaylandı, 3 reddedildi, 4 iptal (ön sipariş), 5 süresi doldu (ön sipariş).
export const ORDER_REQUEST_PENDING = 1;
export const ORDER_REQUEST_APPROVED = 2;
export const ORDER_REQUEST_REJECTED = 3;
export const ORDER_REQUEST_CANCELLED = 4;
export const ORDER_REQUEST_EXPIRED = 5;

/**
 * Müşterinin gördüğü sipariş aşaması (zaman çizelgesi). Onaydan sonra talebin kalemlerinin mutfak durumundan türetilir:
 * hepsi bekliyorsa Approved, mutfak başladıysa Preparing, hepsi hazırsa OnTheWay ("Masanıza geliyor"), hepsi servis
 * edildiyse Served.
 */
export type OrderRequestStage = 'Sent' | 'Approved' | 'Preparing' | 'OnTheWay' | 'Served' | 'Rejected' | 'Cancelled';

export const ORDER_REQUEST_STAGE_LABELS: Record<OrderRequestStage, string> = {
    Sent: 'Gönderildi',
    Approved: 'Onaylandı',
    Preparing: 'Hazırlanıyor',
    OnTheWay: 'Masanıza geliyor',
    Served: 'Servis edildi',
    Rejected: 'Reddedildi',
    Cancelled: 'İptal edildi',
};

/** Aşama bu noktada son buldu mu (yoklama durdurulabilir). */
export function isFinalOrderRequestStage(stage: OrderRequestStage | undefined): boolean {
    return stage === 'Served' || stage === 'Rejected' || stage === 'Cancelled';
}

export interface OrderRequestStatus {
    id: string;
    status: number;
    /** Reddedildiyse garsonun yazdığı neden; boş olabilir. */
    rejectReason?: string;
    /** Müşteri aşaması; eski sunucu: yok (status'a bakılır). */
    stage?: OrderRequestStage;
}

/** Kasiyer hub'ının "BillRequested" olayının dördüncü argümanı: müşterinin hesap isteğindeki tercihi. */
export interface BillRequestHint {
    paymentHint?: number | null;
    splitCount?: number | null;
    remaining?: number;
}

/** "Garson çağır" gövdesi; reason verilmezse nedensiz çağrı (eski davranış). */
export interface CallWaiterInput {
    /** WaiterCallReason (features/customerSite/tableActions). */
    reason?: number;
    /** Yalnız "Diğer"de; en fazla 100 karakter. */
    note?: string;
}

/** "Hesap iste" gövdesi. "Hesap" garson çağırma nedeni değildir; bu uçtan gider. */
export interface RequestBillInput {
    /** BillPaymentHint: 1 Nakit, 2 Kart, 3 IBAN. */
    paymentHint?: number;
    /** Hesap kaç kişiye bölünecek (2–20). */
    splitCount?: number;
}

// Backend ReservationStatus: 2 iptal, 3 bekliyor, 4 onaylandı, 5 reddedildi, 6 geldi, 7 gelmedi (1: personelin açtığı eski tip).
export const RESERVATION_CANCELLED = 2;
export const RESERVATION_PENDING = 3;
export const RESERVATION_CONFIRMED = 4;
export const RESERVATION_REJECTED = 5;
export const RESERVATION_SEATED = 6;
export const RESERVATION_NO_SHOW = 7;

/** Bu cihazdan gönderilmiş rezervasyon; accessToken /rezervasyon/:token bağlantısının gizli anahtarıdır. */
export interface ReservationStatusInfo {
    accessToken: string;
    /** Kısa kod, "K7M-2QP": kod + telefonla /rezervasyon-sorgula'dan rezervasyon yeniden bulunur. */
    code: string;
    status: number;
    tableName: string;
    guestName: string;
    date: string;
    time: string;
    endTime: string;
    partySize: number;
}

// ── Rezervasyon bağlantısı ve ön sipariş (/rezervasyon/:token) ───────────────

export interface PreOrderWindow {
    /** Şubede ön sipariş açık mı. */
    enabled: boolean;
    opensAt: string;
    closesAt: string;
    /** Şubenin yerel saatiyle "HH:mm". */
    opensAtTime: string;
    closesAtTime: string;
    canPreOrder: boolean;
    /** Verilemiyorsa müşteriye gösterilecek neden. */
    reason: string | null;
}

export interface PublicPreOrder {
    /** ORDER_REQUEST_*: 1 alındı, 2 mutfağa gönderildi, 4 iptal, 5 süresi doldu. */
    status: number;
    note: string;
    total: number;
    items: OrderRequestItem[];
    canEdit: boolean;
    canCancel: boolean;
}

export interface ReservationDetail {
    /** "K7M-2QP". */
    code: string;
    status: number;
    /** "Ahmet Y." */
    guestName: string;
    tableName: string;
    partySize: number;
    date: string;
    time: string;
    endTime: string;
    startsAtUtc: string;
    branchName: string;
    restaurantPhone: string;
    /** Menü: publicService.getSite(branchId). */
    branchId: string;
    preOrderWindow: PreOrderWindow;
    preOrder: PublicPreOrder | null;
    outOfStockProductIds: string[];
    /** Misafir rezervasyonu kendisi iptal edebilir mi (bekliyor/onaylı ve son iptal anı geçmemiş). */
    canCancel: boolean;
    /** Online iptalin son anı (UTC): rezervasyondan 2 saat önce. */
    cancelDeadline: string;
}

// ── Personel tarafı ──────────────────────────────────────────────────────────

export interface OrderRequestItem {
    /** "product" ya da "setMenu" (eski sunucu: yok → ürün). */
    kind?: 'product' | 'setMenu';
    productId: string | null;
    setMenuId?: string | null;
    /** Ürünün ya da menünün adı. */
    productName: string;
    /** Menü kaleminde seçilen ürünler ("Kola (+₺10)"); üründe boş. */
    selections?: string[];
    quantity: number;
    unitPrice: number;
    note: string;
    /** Müşteri QR'da "Paket olsun" dedi (eski sunucu: yok). */
    isTakeaway?: boolean;
}

export interface OrderRequest {
    id: string;
    tableId: string;
    tableName: string;
    regionName: string;
    note: string;
    createdAt: string;
    total: number;
    items: OrderRequestItem[];
}

/** Sunucunun "OrderRequestCreated" olayı: müşteri masadaki QR menüden sipariş gönderdi, onay bekliyor. */
export interface OrderRequestCreatedEvent {
    requestId: string;
    tableId: string;
    tableName: string;
    regionId: string;
    regionName: string;
    /** Taleplerdeki toplam adet (2× çay + 1× menü = 3). */
    itemCount: number;
    /** Bunlardan müşterinin "Paket olsun" dediği adet (eski sunucu: yok). */
    takeawayCount?: number;
    createdAt: string;
}

export type CustomerActivityKind =
    | 'reservationRequested'
    | 'reservationCancelled'
    | 'preOrderPlaced'
    | 'preOrderUpdated'
    | 'contactMessage';

/** Sunucunun "CustomerActivity" olayı: müşteri sitede personelin hemen görmesi gereken bir şey yaptı. */
export interface CustomerActivityEvent {
    kind: CustomerActivityKind;
    /** Rezervasyon olaylarında dolu; iletişim mesajında null. */
    tableId: string | null;
    tableName: string | null;
    regionId: string | null;
    guestName: string | null;
    partySize: number | null;
    /** Şube saatine göre "yyyy-MM-dd" ve "HH:mm". */
    date: string | null;
    time: string | null;
    occurredAt: string;
}

export interface StaffReservation {
    id: string;
    /** Kısa kod, "K7M-2QP": telefonda müşteriye okunur. */
    code: string;
    /** Müşterinin rezervasyon bağlantısının anahtarı (/rezervasyon/:token). */
    accessToken: string;
    /** Restoranın alt alan adı; bağlantı https://{siteSlug}.sophram.com/rezervasyon/{accessToken}. */
    siteSlug: string;
    status: number;
    tableId: string;
    tableName: string;
    regionName: string;
    guestName: string;
    contact: string;
    note: string;
    partySize: number;
    date: string;
    time: string;
    endTime: string;
    startsAtUtc: string;
    createdAt: string;
    /** Son ön sipariş (bekleyen, gönderilmiş, iptal ya da süresi dolmuş); yoksa null. */
    preOrder: StaffPreOrder | null;
    /** Masada ödenmemiş hesap var: "Geldi" ön siparişi o hesaba ekler. */
    tableHasOpenOrder: boolean;
}

export interface StaffPreOrder {
    status: number;
    note: string;
    total: number;
    updatedAt: string;
    items: OrderRequestItem[];
}
