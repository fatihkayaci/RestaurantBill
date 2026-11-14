export interface Table {
    id: string;
    name: string;
    status: number;
    activeOrderTotal: number;
    /** Açık siparişten tutar girerek alınmış ödemeler. */
    paidAmount?: number;
    /** Açık siparişte ödenecek kalan. */
    remainingAmount?: number;
    occupiedSince: string | null;
    createdByUserName: string;
    /** Açık siparişte hesap istendiyse istek anı. */
    billRequestedAt?: string | null;
    /** Hazırlanma süresini aşmış kalem sayısı (garson kartındaki "Gecikme"). */
    overdueItemCount?: number;
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
