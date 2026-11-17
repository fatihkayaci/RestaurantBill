// Online paket sipariş: müşteri sitesi (/siparis), takip sayfası ve personel ekranlarının ortak tipleri.
// Backend: Application/DTOs/Delivery/DeliveryDtos.cs. Enum'lar sayı olarak gelir.
import type { DeliveryOrderStatus, DoorPaymentMethod } from '@/features/courier/types';

export type { DeliveryOrderStatus, DoorPaymentMethod } from '@/features/courier/types';
export { DoorPayment } from '@/features/courier/types';

export const DeliveryStatus = {
    Received: 1,
    Accepted: 2,
    Preparing: 3,
    Ready: 4,
    OnTheWay: 5,
    Delivered: 6,
    Rejected: 7,
    Cancelled: 8,
} as const satisfies Record<string, DeliveryOrderStatus>;

// ── Müşteri sitesi ────────────────────────────────────────────────────────────────────────────

export type OnlineOrderingState = 'open' | 'paused' | 'closed' | 'disabled';

export interface DeliveryZone {
    id: string;
    name: string;
    fee: number;
    minOrderAmount: number;
    estimatedMinutes: number;
    isActive: boolean;
    sortOrder: number;
}

export interface OnlineMenuProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    /** Görsel hazır görsel kütüphanesinden: "Temsili görsel" etiketi gösterilir. */
    isStockImage: boolean;
    description: string;
    isFeatured: boolean;
    /** "Tükendi": listede görünür, sepete eklenemez. */
    isOutOfStock: boolean;
}

export interface OnlineMenuCategory {
    id: string;
    name: string;
    products: OnlineMenuProduct[];
}

export interface OnlineSetMenuOption {
    productId: string;
    productName: string;
    surcharge: number;
    isDefault: boolean;
    /** Ürün pasif ya da tükendiyse seçilemez. */
    isAvailable: boolean;
}

export interface OnlineSetMenuSlot {
    id: string;
    name: string;
    isFixed: boolean;
    options: OnlineSetMenuOption[];
}

export interface OnlineSetMenu {
    id: string;
    name: string;
    description: string;
    price: number;
    /** İndirimsiz fiyat (taban ürünlerin normal fiyatları); price'tan büyükse menü indirimlidir. */
    regularPrice: number;
    imageUrl: string;
    /** Görsel hazır görsel kütüphanesinden: "Temsili görsel" etiketi gösterilir. */
    isStockImage: boolean;
    categoryId?: string | null;
    /** Her bölümde seçilebilir en az bir seçenek var mı (yoksa "Tükendi"). */
    isAvailable: boolean;
    slots: OnlineSetMenuSlot[];
}

export interface OnlineBranch {
    id: string;
    name: string;
    district: string;
}

export interface OnlineOrdering {
    branchId: string;
    branchName: string;
    restaurantPhone: string;
    state: OnlineOrderingState;
    isOpen: boolean;
    /** Kapalıyken müşteriye gösterilecek açıklama (şubenin yerel saatiyle yazılmış); açıkken boş. */
    message: string;
    nextOpensAt?: string | null;
    lastOrderAt?: string | null;
    zones: DeliveryZone[];
    paymentMethods: DoorPaymentMethod[];
    requiresPhoneVerification: boolean;
    categories: OnlineMenuCategory[];
    setMenus: OnlineSetMenu[];
    /** Online siparişi açık şubeler; birden fazlaysa şube seçici gösterilir. */
    branches: OnlineBranch[];
}

/** Sepet satırı (sunucuya giden). Fiyat gönderilmez; sunucu hesaplar. */
export interface CartLineInput {
    kind: 'product' | 'setMenu';
    productId?: string;
    setMenuId?: string;
    quantity: number;
    note?: string;
    selections: { slotId: string; productId: string }[];
}

export interface DeliveryQuoteLine {
    kind: 'product' | 'setMenu';
    productId?: string | null;
    setMenuId?: string | null;
    name: string;
    selections: string[];
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    note: string;
}

export interface DeliveryQuote {
    lines: DeliveryQuoteLine[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    zoneId?: string | null;
    zoneName: string;
    minOrderAmount: number;
    meetsMinimum: boolean;
    amountToMinimum: number;
    estimatedMinutes: number;
}

export interface SubmitDeliveryOrderInput {
    branchId?: string;
    clientRequestId: string;
    zoneId: string;
    lines: CartLineInput[];
    customerName: string;
    phone: string;
    address: string;
    addressDirections?: string;
    note?: string;
    paymentMethod: DoorPaymentMethod;
    expectedTotal: number;
    /** Bal küpü: insan doldurmaz. */
    website?: string;
    verificationToken?: string;
}

export interface SubmittedDeliveryOrder {
    token: string;
    number: number;
}

export interface PhoneVerificationSent {
    expiresInSeconds: number;
    resendAfterSeconds: number;
}

export interface PhoneVerified {
    verificationToken: string;
    expiresInSeconds: number;
}

export interface DeliveryLine {
    kind: number;
    productId?: string | null;
    setMenuId?: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    note: string;
    selections: string[];
}

export interface DeliveryTracking {
    number: number;
    status: DeliveryOrderStatus;
    statusLabel: string;
    statusDescription: string;
    customerName: string;
    customerPhone: string;
    zoneName: string;
    paymentPreference: DoorPaymentMethod;
    lines: DeliveryLine[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    createdAt: string;
    estimatedMinutes?: number | null;
    estimatedDeliveryAt?: string | null;
    deliveredAt?: string | null;
    /** Kuryenin yola çıktığı an. */
    dispatchedAt?: string | null;
    /** Yalnızca sipariş yoldayken dolu: kuryenin ilk adı. */
    courierFirstName?: string;
    rejectReason: string;
    cancelReason: string;
    canCancel: boolean;
    branchName: string;
    restaurantPhone: string;
    /** Takip sayfasının markası (restoran sitesiyle aynı alanlar). */
    companyName?: string;
    /** "#RRGGBB" ya da boş. */
    accentColor?: string;
    /** Sitenin hazır renk teması; boş = varsayılan. */
    theme?: string;
    coverImageUrl?: string;
    /** Restoranın onayladığı an. */
    acceptedAt?: string | null;
}

// ── Personel ──────────────────────────────────────────────────────────────────────────────────

export interface DeliveryOrder {
    id: string;
    branchId: string;
    number: number;
    status: DeliveryOrderStatus;
    statusLabel: string;
    customerName: string;
    customerPhone: string;
    address: string;
    addressDirections: string;
    note: string;
    deliveryZoneId?: string | null;
    zoneName: string;
    paymentPreference: DoorPaymentMethod;
    lines: DeliveryLine[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    orderId?: string | null;
    estimatedMinutes?: number | null;
    /** Kabulde önerilecek süre: bölgenin süresi, yoksa şube varsayılanı. */
    suggestedEtaMinutes: number;
    createdAt: string;
    /** Yanıtlanmazsa otomatik reddedileceği an (yalnızca Yeni). */
    autoRejectAt?: string | null;
    acceptedAt?: string | null;
    rejectedAt?: string | null;
    rejectReason: string;
    isAutoRejected: boolean;
    cancelledAt?: string | null;
    cancelReason: string;
    cancelledByCustomer: boolean;
    courierUserId?: string | null;
    courierName?: string | null;
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
    collectedMethod?: DoorPaymentMethod | null;
    collectedAmount?: number | null;
    settledAt?: string | null;
    isPhoneBlocked: boolean;
}

/** SignalR "DeliveryOrdersChanged" (kasiyer hub'ı, OnlineOrders grubu). */
export interface DeliveryOrdersChangedEvent {
    id: string;
    status: DeliveryOrderStatus;
    isNew: boolean;
}

// ── Ayarlar ───────────────────────────────────────────────────────────────────────────────────

export interface OnlineOrderDay {
    /** 0 Pazar … 6 Cumartesi. */
    day: number;
    isOpen: boolean;
    /** "HH:mm" */
    opens: string;
    /** "HH:mm"; açılıştan küçük ya da eşitse gece yarısını aşar. */
    closes: string;
}

export interface OnlineOrderSettings {
    enabled: boolean;
    paused: boolean;
    days: OnlineOrderDay[];
    lastOrderMinutesBeforeClose: number;
    defaultEtaMinutes: number;
    autoRejectAfterMinutes: number;
    maxOpenOrdersPerPhone: number;
    maxOrdersPerPhonePerDay: number;
    acceptCash: boolean;
    acceptCard: boolean;
    requirePhoneVerification: boolean;
    /** SMS sağlayıcısı yok: doğrulama açık olsa da kod gönderilmez, istenmez. */
    smsConfigured: boolean;
    preOrderEnabled: boolean;
    preOrderLeadMinutes: number;
    isCustomized: boolean;
}

export type OnlineOrderSettingsInput = Omit<OnlineOrderSettings, 'paused' | 'smsConfigured' | 'isCustomized'> & {
    resetToDefaults?: boolean;
};

export interface DeliveryZoneInput {
    name: string;
    fee: number;
    minOrderAmount: number;
    estimatedMinutes: number;
    isActive: boolean;
}

export interface BlockedPhone {
    id: string;
    phone: string;
    reason: string;
    createdAt: string;
    blockedByName: string;
    /** Engel yüzünden geri çevrilen sipariş denemeleri. */
    blockedAttemptCount: number;
    lastBlockedAttemptAt?: string | null;
    /** Engel panodaki bir siparişten konduysa o sipariş. */
    sourceDeliveryOrderId?: string | null;
    sourceDeliveryOrderNumber?: number | null;
}
