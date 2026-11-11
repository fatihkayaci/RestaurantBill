export interface PublicProduct {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
}

export interface PublicCategory {
    id: string;
    name: string;
    products: PublicProduct[];
}

export interface PublicTable {
    id: string;
    name: string;
}

export interface PublicRegion {
    id: string;
    name: string;
    tables: PublicTable[];
}

export interface PublicSite {
    companyName: string;
    branchId: string;
    branchName: string;
    city: string;
    district: string;
    openAddress: string;
    phone: string;
    branches: { id: string; name: string }[];
    categories: PublicCategory[];
    regions: PublicRegion[];
}

export interface PublicTableInfo {
    id: string;
    name: string;
    regionName: string;
    branchId: string;
}

export interface Availability {
    unavailableTableIds: string[];
}

// Backend OrderRequestStatus: 1 bekliyor, 2 onaylandı, 3 reddedildi.
export const ORDER_REQUEST_PENDING = 1;
export const ORDER_REQUEST_APPROVED = 2;
export const ORDER_REQUEST_REJECTED = 3;

export interface OrderRequestStatus {
    id: string;
    status: number;
}

// Backend ReservationStatus: 2 iptal, 3 bekliyor, 4 onaylandı, 5 reddedildi (1: personelin açtığı eski tip).
export const RESERVATION_CANCELLED = 2;
export const RESERVATION_PENDING = 3;
export const RESERVATION_CONFIRMED = 4;
export const RESERVATION_REJECTED = 5;

export interface ReservationStatusInfo {
    id: string;
    status: number;
    tableName: string;
    guestName: string;
    date: string;
    time: string;
    endTime: string;
    partySize: number;
}

// ── Personel tarafı ──────────────────────────────────────────────────────────

export interface OrderRequestItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    note: string;
}

export interface OrderRequest {
    id: string;
    tableId: string;
    tableName: string;
    regionName: string;
    note: string;
    createdAt: string;
    total: number;
    items: OrderRequestItem[];
}

export interface StaffReservation {
    id: string;
    status: number;
    tableId: string;
    tableName: string;
    regionName: string;
    guestName: string;
    contact: string;
    note: string;
    partySize: number;
    date: string;
    time: string;
    endTime: string;
    startsAtUtc: string;
    createdAt: string;
}
