export interface Table {
    id: number;
    name: string;
    status: number;
    activeOrderTotal: number;
    occupiedSince: string | null;
}

export interface Reservation {
    id: number;
    tableId: number;
    guestName: string;
    contact: string;
    reservationTime: string;
    note: string;
}
