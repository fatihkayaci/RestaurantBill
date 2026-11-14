/** Backend DeliveryOrderStatus: 1 Yeni, 2 Kabul, 3 Hazırlanıyor, 4 Hazır, 5 Yolda, 6 Teslim edildi, 7 Reddedildi, 8 İptal. */
export type DeliveryOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Kapıda ödeme: 1 Kart, 2 Nakit (backend PaymentMethod). */
export type DoorPaymentMethod = 1 | 2;

export const DoorPayment = { Kart: 1, Nakit: 2 } as const satisfies Record<string, DoorPaymentMethod>;

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
    outstandingOrders: CourierOutstandingOrder[];
}

export interface CourierHandoverResult {
    settledCount: number;
    cashAmount: number;
    cardAmount: number;
    total: number;
}

export function mapsUrl(query: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** "+905321234567" → "tel:+905321234567". */
export function telUrl(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
