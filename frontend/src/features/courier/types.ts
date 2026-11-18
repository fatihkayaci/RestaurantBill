/** Backend DeliveryOrderStatus: 1 Yeni, 2 Kabul, 3 Hazırlanıyor, 4 Hazır, 5 Yolda, 6 Teslim edildi, 7 Reddedildi, 8 İptal. */
export type DeliveryOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Paket ödeme: 1 Kart, 2 Nakit (kapıda), 4 IBAN (havale/EFT; kurye para almaz). Backend PaymentMethod. */
export type DoorPaymentMethod = 1 | 2 | 4;

export const DoorPayment = { Kart: 1, Nakit: 2, Iban: 4 } as const satisfies Record<string, DoorPaymentMethod>;

/** Küçük harfli kısa ad: "nakit", "kart", "IBAN". */
export function doorPaymentWord(method: DoorPaymentMethod | null | undefined): string {
    return method === DoorPayment.Nakit ? 'nakit' : method === DoorPayment.Iban ? 'IBAN' : 'kart';
}

/** Personel ekranlarındaki etiket: "Nakit", "Kart", "IBAN (havale)". */
export function doorPaymentLabel(method: DoorPaymentMethod | null | undefined): string {
    return method === DoorPayment.Nakit ? 'Nakit' : method === DoorPayment.Iban ? 'IBAN (havale)' : 'Kart';
}

export interface CourierOrderLine {
    kind: number;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    note: string;
    /** Menü satırında seçilen ürünlerin adları. */
    selections: string[];
}

export interface CourierOrder {
    id: string;
    number: number;
    status: DeliveryOrderStatus;
    statusLabel: string;
    customerName: string;
    customerPhone: string;
    address: string;
    addressDirections: string;
    zoneName: string;
    note: string;
    /** "adres, bölge, şehir": Google Maps aramasına kodlanarak konur. */
    mapsQuery: string;
    lines: CourierOrderLine[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    paymentPreference: DoorPaymentMethod;
    acceptedAt?: string | null;
    estimatedDeliveryAt?: string | null;
    dispatchedAt?: string | null;
    deliveredAt?: string | null;
    collectedMethod?: DoorPaymentMethod | null;
    collectedAmount?: number | null;
    settledAt?: string | null;
    canDispatch: boolean;
    canDeliver: boolean;
    /** "Teslimi geri al" bu ana kadar basılabilir; süre geçtiyse ya da kasaya teslim edildiyse yok. */
    undoDeliverUntil?: string | null;
}

export interface CourierBulkDispatchResult {
    dispatchedCount: number;
    dispatchedNumbers: number[];
    /** İstenip yola çıkarılamayanlar (artık hazır değil, iptal ya da başka kuryeye geçti). */
    skippedCount: number;
}

export interface CourierDaySummary {
    deliveredTodayCount: number;
    activeOrderCount: number;
    outstandingCash: number;
    outstandingCashOrderCount: number;
    outstandingCard: number;
    outstandingCardOrderCount: number;
}

/** Kasiyerin "Teslim al" listesi: kuryenin tahsil edip kasaya teslim etmediği sipariş. */
export interface CourierOutstandingOrder {
    deliveryOrderId: string;
    number: number;
    zoneName: string;
    customerName: string;
    collectedMethod: DoorPaymentMethod;
    collectedAmount: number;
    deliveredAt?: string | null;
    /** Kuryenin tahsil ettiği an. */
    collectedAt?: string | null;
    /** Önceki iş gününde tahsil edildi, hâlâ kasaya teslim edilmedi. */
    isFromPreviousDay: boolean;
}

export interface CourierCashSummary {
    userId: string;
    fullName: string;
    phoneNumber: string;
    openOrderCount: number;
    onTheWayCount: number;
    outstandingCash: number;
    outstandingCashOrderCount: number;
    outstandingCard: number;
    outstandingCardOrderCount: number;
    /** Önceki iş günlerinden kalan, teslim edilmemiş nakit. */
    previousDayCash: number;
    /** Önceki iş günlerinden kalan (nakit + kart) sipariş sayısı. */
    previousDayOrderCount: number;
    oldestCollectedAt?: string | null;
    outstandingOrders: CourierOutstandingOrder[];
}

export interface CourierHandoverResult {
    settledCount: number;
    cashAmount: number;
    cardAmount: number;
    total: number;
    expectedCash: number;
    /** Sayım girilmediyse ya da nakit yoksa null. */
    countedCash: number | null;
    /** Sayılan − beklenen; eksi = eksik. */
    cashDifference: number | null;
}

/** "Teslim geçmişi"nde bir teslim. */
export interface CourierHandoverHistory {
    settledAt: string;
    courierUserId: string;
    courierName: string;
    settledByName: string;
    orderCount: number;
    numbers: number[];
    expectedCash: number;
    cardAmount: number;
    countedCash: number | null;
    cashDifference: number | null;
}

export function mapsUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** "+905321234567" → "tel:+905321234567". */
export function telUrl(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
