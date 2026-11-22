// Online paket sipariş: müşteri sitesi (/siparis), takip sayfası ve personel ekranlarının ortak tipleri.
// Backend: Application/DTOs/Delivery/DeliveryDtos.cs. Enum'lar sayı olarak gelir.
import type { DeliveryOrderStatus, DoorPaymentMethod } from '@/features/courier/types';
import type { TableIbanPayment } from '@/features/customerSite/tableIbanPayment';

export type { DeliveryOrderStatus, DoorPaymentMethod } from '@/features/courier/types';
export { DoorPayment, doorPaymentLabel, doorPaymentWord } from '@/features/courier/types';
export type { TableIbanPayment } from '@/features/customerSite/tableIbanPayment';

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
    /** Admin'in "Yeni" etiketi (30 gün); eski sunucuda yok. */
    isNew?: boolean;
    /** "Tükendi": listede görünür, sepete eklenemez. */
    isOutOfStock: boolean;
    /** Alerjen bayrakları (features/products/dietaryTags: ALLERGENS); eski sunucu: yok. */
    allergens?: number;
    /** Diyet / bilgi etiketleri (DIET_TAGS: vegan, vejetaryen, glutensiz, helal, acılı); eski sunucu: yok. */
    dietTags?: number;
}

/** Kategorinin müşteri menüsündeki görünümü: "auto" (fotoğraflı ürün yarıdan azsa liste), "cards", "list". */
export type MenuDisplay = 'auto' | 'cards' | 'list';

export interface OnlineMenuCategory {
    id: string;
    name: string;
    /** Eski sunucuda yok: otomatik. */
    menuDisplay?: MenuDisplay;
    /** Kategorinin servis penceresine göre şu an sipariş edilebilir mi (şubenin saatiyle); eski sunucu: yok, açık say. */
    availableNow?: boolean;
    /** "12:00'ye kadar", "18:00'den itibaren", "Hafta içi 08:00–12:00"; pencere yoksa boş. */
    availabilityLabel?: string;
    products: OnlineMenuProduct[];
}

export interface OnlineSetMenuOption {
    productId: string;
    productName: string;
    surcharge: number;
    isDefault: boolean;
    /** Ürün pasif ya da tükendiyse (ya da kategorisi şu an servis dışıysa) seçilemez. */
    isAvailable: boolean;
    /** Alerjen bayrakları (features/products/dietaryTags: ALLERGENS); eski sunucu: yok. */
    allergens?: number;
    /** Diyet / bilgi etiketleri (DIET_TAGS: vegan, vejetaryen, glutensiz, helal, acılı); eski sunucu: yok. */
    dietTags?: number;
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
    /** "Şefin tavsiyesi" bölümünde öne çıkan ürünlerin yanında gösterilir. */
    isFeatured: boolean;
    /** Seçeneklerin alerjenlerinin birleşimi. Etiketler: "Acılı" birinde varsa; uygunluk (vegan…) yalnız hepsinde varsa. */
    allergens?: number;
    dietTags?: number;
    /** Kategorinin servis penceresine göre şu an sipariş edilebilir mi (şubenin saatiyle); eski sunucu: yok, açık say. */
    availableNow?: boolean;
    /** "12:00'ye kadar", "18:00'den itibaren", "Hafta içi 08:00–12:00"; pencere yoksa boş. */
    availabilityLabel?: string;
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
    /** paymentMethods'ta IBAN varken ödeme adımında gösterilen hesap bilgileri; yoksa null. */
    ibanPayment?: TableIbanPayment | null;
    requiresPhoneVerification: boolean;
    /** Şubenin popüler ürünleri (son 30 günün satışı; QR menünün PopularProducts'ı). Bu sürümde sunucu göndermez:
     *  yoksa "Popüler" süzgeci gizlenir. */
    popularProductIds?: string[];
    /** Müşteri "Gel al"ı seçebilir mi (şube ayarı). Eski sunucuda yok: kapalı sayılır. */
    pickupEnabled?: boolean;
    /** Gel al siparişinin yaklaşık hazır olma süresi (dakika). */
    pickupEtaMinutes?: number;
    /** Gel al için restoranın adresi. */
    pickupAddress?: string;
    /** Şubenin "nasıl gelinir" notu. */
    pickupDirections?: string;
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
    /** Gel al: bölge ve adres gönderilmez, teslimat ücreti yok. */
    pickup?: boolean;
    /** Yalnızca adrese teslimde. */
    zoneId?: string;
    lines: CartLineInput[];
    customerName: string;
    phone: string;
    address: string;
    addressDirections?: string;
    note?: string;
    /** Adrese teslimde zorunlu. Gel al'da gönderilmez (restoranda ödenir) ya da yalnızca IBAN. */
    paymentMethod?: DoorPaymentMethod | null;
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
    /** Gel al siparişi: "Yolda" adımı yok, restoranın adresi gösterilir. */
    isPickup?: boolean;
    /** Gel al siparişinde restoranın adresi. */
    pickupAddress?: string;
    customerName: string;
    customerPhone: string;
    zoneName: string;
    /** Gel al'da null: ödeme restoranda, yöntem teslimde belli olur. */
    paymentPreference: DoorPaymentMethod | null;
    /** IBAN tercihli, iptal/ret olmamış siparişte havale bilgileri; yoksa null. */
    ibanPayment?: TableIbanPayment | null;
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
    /** Sitenin tasarımı ("renkli" | "sade"); boş = renkli. */
    design?: string;
    /** Sitenin yazı tipi çifti; boş = tasarımın kendi yazı tipi. */
    font?: string;
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
    /** 2 adrese teslim, 3 gel al. */
    orderType?: 2 | 3;
    /** Gel al: adres, bölge ve kurye yok; müşteri restorandan alır, ödeme kasada alınır. */
    isPickup?: boolean;
    customerName: string;
    customerPhone: string;
    address: string;
    addressDirections: string;
    note: string;
    deliveryZoneId?: string | null;
    zoneName: string;
    /** Gel al'da null: müşteri restoranda öder, yöntem "Müşteri aldı"da seçilir. */
    paymentPreference: DoorPaymentMethod | null;
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
    /** IBAN ile ödeme (havale/EFT); şubede IBAN yoksa müşteriye gösterilmez. */
    acceptIban: boolean;
    /** Şubede müşteriye gösterilebilecek IBAN var mı (Ayarlar → Ödeme). */
    hasIban: boolean;
    requirePhoneVerification: boolean;
    /** SMS sağlayıcısı yok: doğrulama açık olsa da kod gönderilmez, istenmez. */
    smsConfigured: boolean;
    preOrderEnabled: boolean;
    preOrderLeadMinutes: number;
    /** "Gel al": müşteri online sipariş verip restorandan kendisi alır. */
    pickupEnabled: boolean;
    /** Gel al siparişinin yaklaşık hazır olma süresi (dakika). */
    pickupEtaMinutes: number;
    isCustomized: boolean;
}

export type OnlineOrderSettingsInput = Omit<OnlineOrderSettings, 'paused' | 'smsConfigured' | 'isCustomized' | 'hasIban'> & {
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
