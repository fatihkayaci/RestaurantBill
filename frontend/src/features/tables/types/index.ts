export interface Table {
    id: string;
    name: string;
    /** En fazla kaç kişi (rezervasyonda gösterilir); girilmemişse null. */
    capacity?: number | null;
    /** Bölge içindeki sıra (küçük önce); liste sunucudan bu sırayla gelir. */
    sortOrder?: number;
    status: number;
    /** Personel bu masada QR'dan siparişi kilitledi (müşteri menüye bakar, sipariş gönderemez). Eski sunucu: yok. */
    qrOrderingLocked?: boolean;
    activeOrderTotal: number;
    /** Açık siparişten tutar girerek alınmış ödemeler. */
    paidAmount?: number;
    /** Açık siparişte ödenecek kalan. */
    remainingAmount?: number;
    occupiedSince: string | null;
    createdByUserName: string;
    /** Açık siparişte hesap istendiyse istek anı. */
    billRequestedAt?: string | null;
    /** Müşterinin QR'dan hesap isterken seçtiği ödeme tercihi (1 Nakit, 2 Kart, 3 IBAN; BillPaymentHint). */
    billPaymentHint?: number | null;
    /** Müşteri hesabın kaç kişiye bölüneceğini söyledi (2–20). */
    billSplitCount?: number | null;
    /** Hazırlanma süresini aşmış kalem sayısı (garson kartındaki "Gecikme"). */
    overdueItemCount?: number;
    /** Mutfağın "hazır" dediği, servis bekleyen ürün adedi (Genel Bakış'taki readyItems ile aynı). Eski sunucu: yok. */
    readyItemCount?: number;
    regionId: string;
    regionName: string;
}

export interface Reservation {
    id: string;
    tableId: string;
    /** Kısa kod, "K7M-2QP". */
    code: string;
    accessToken: string;
    guestName: string;
    contact: string;
    reservationTime: string;
    note: string;
}

export interface BulkCreateTablesResult {
    createdNames: string[];
    /** Bölgede zaten olduğu için atlanan adlar. */
    skippedNames: string[];
}
