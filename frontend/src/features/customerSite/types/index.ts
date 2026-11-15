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
    /** Tahmini hazırlanma süresi (dk); null ise gösterilmez. */
    prepMinutes: number | null;
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
    /** "HH:mm" ya da null */
    opensAt: string | null;
    closesAt: string | null;
    hoursNote: string;
    instagramUrl: string;
    /** "#RRGGBB" ya da boş */
    accentColor: string;
}

export interface PublicCategory {
    id: string;
    name: string;
    products: PublicProduct[];
}

export interface PublicTable {
    id: string;
    name: string;
}

export interface PublicRegion {
    id: string;
    name: string;
    tables: PublicTable[];
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
    /** Şubenin yerel saatine göre; saat girilmemişse null. */
    isOpenNow: boolean | null;
    reservation: ReservationRules;
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
}

/** Masa QR karşılama ekranının anahtarları; admin "QR menü özellikleri" de aynı şekli kullanır. */
export interface QrFeatures {
    orderingEnabled: boolean;
    callWaiterEnabled: boolean;
    billRequestEnabled: boolean;
    deliveryLinkEnabled: boolean;
    reservationLinkEnabled: boolean;
}

/** "Garson çağır" / "Hesap iste" sonucu. sent=false: bu masadan az önce yapılmış, yeniden bildirilmedi. */
export interface TableActionResult {
    sent: boolean;
    retryAfterSeconds: number;
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

export interface OrderRequestStatus {
    id: string;
    status: number;
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
}

// ── Personel tarafı ──────────────────────────────────────────────────────────

export interface OrderRequestItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    note: string;
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
