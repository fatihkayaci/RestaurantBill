export interface Table {
    id: string;
    name: string;
    status: number;
    activeOrderTotal: number;
    occupiedSince: string | null;
    createdByUserName: string;
    regionId: string;
    regionName: string;
}

export interface Reservation {
    id: string;
    tableId: string;
    guestName: string;
    contact: string;
    reservationTime: string;
    note: string;
}
