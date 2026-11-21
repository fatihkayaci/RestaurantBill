export interface OrderItem {
    id: number;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    status: number;
    is_load: boolean;
    categoryName: string;
    taxRate: number;
    note: string;
    createdAt: string;
    /** Sipariş anındaki hazırlanma süresi (dk); null ise geri sayım yok. */
    prepMinutes: number | null;
    /** Paket kalem: müşteri QR'da "Paket olsun" dedi (eski sunucu: yok). */
    isTakeaway?: boolean;
    /**
     * Menü satırıysa menünün Id'si. Menü satırında productId boş Guid'dir, productName menünün adıdır,
     * fiyat menü fiyatı + ek ücretlerdir. Silme/adet için orderItemId kullanılır.
     */
    setMenuId?: string | null;
    /** Menü satırının içindeki ürünler (0 ₺). Hesap ekranlarında satırın altında gösterilebilir. */
    components?: OrderItem[];
    /** Menü içeriği: bağlı olduğu menü satırı. Mutfak yanıtında içerik üst düzeyde, menü satırının yerinde gelir. */
    parentOrderItemId?: number | null;
    /** Menü içeriğinin menüsünün adı; mutfakta ürünler bu başlık altında gruplanır. */
    setMenuName?: string | null;
    /** Menü satırının notu (mutfak menü satırını görmez). */
    setMenuNote?: string | null;
}

/** Backend OrderType: 1 masa, 2 paket (online, adrese teslim), 3 gel al (online, müşteri restorandan alır). */
export type OrderType = 1 | 2 | 3;

export interface Order {
    id: number;
    /** Paket siparişte null. */
    tableId: string | null;
    /** Masa adı; paket siparişte "PAKET #123 · Moda". */
    tableName: string;
    orderType: OrderType;
    /** Paket siparişin şube içindeki numarası; masa siparişinde null. */
    deliveryNumber?: number | null;
    /** Paket siparişin teslimat bölgesi; masa siparişinde null. */
    zoneName?: string | null;
    note: string;
    totalPrice: number;
    /** Tutar girerek (ürün seçmeden) alınmış ödemeler; ürünler masada kalır. */
    paidAmount?: number;
    /** Ödenecek kalan: totalPrice - paidAmount. */
    remainingAmount?: number;
    status: number;
    createdAt: string;
    createdByUserName: string;
    /** Garson hesabı istediyse istek anı; yoksa null. */
    billRequestedAt?: string | null;
    /** Hesap masa QR'ında bir telefona bağlı: yalnız o telefon QR'dan sipariş verir ve hesabı görür. */
    qrLocked?: boolean;
    orderItems: OrderItem[];
}

/** Mutfak ürünleri hazır (pasada) işaretleyince garsonlara gelen SignalR olayı: "ItemsReady". */
export interface ItemsReadyEvent {
    orderId: string;
    /** Paket siparişte boş Guid; olay kasiyer hub'ının online sipariş grubuna gelir. */
    tableId: string;
    /** Paket siparişin numarası; masa siparişinde null. */
    deliveryNumber?: number | null;
    tableName: string;
    regionId: string;
    items: { orderItemId: string; productName: string; quantity: number; note: string | null }[];
    readyAt: string;
}
