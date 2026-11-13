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
}

export interface Order {
    id: number;
    tableId: string;
    tableName: string;
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
    orderItems: OrderItem[];
}
