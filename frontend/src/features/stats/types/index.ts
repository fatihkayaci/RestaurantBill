export interface TopProduct {
    name: string;
    sold: number;
}

export interface OverviewStats {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    occupiedTables: number;
    totalTables: number;
    topProducts: TopProduct[];
}

export type BranchOperationalStatus = 'open' | 'closed' | 'expired';

export interface RevenueTrendPoint {
    date: string;
    total: number;
    byBranch: Record<string, number>;
}

export interface PaymentMethodBreakdown {
    method: number;
    amount: number;
    percent: number;
}

export interface BranchPerformanceRow {
    branchId: string;
    branchName: string;
    city: string;
    district: string;
    status: BranchOperationalStatus;
    todayRevenue: number;
    todayRevenueChangePercent: number | null;
    todayOrders: number;
    todayOrdersChangePercent: number | null;
    avgBasket: number;
    staffCount: number;
    openTables: number;
    totalTables: number;
    pendingOrders: number;
}

export interface OwnerDashboardStats {
    totalRevenue: number;
    totalRevenueChangePercent: number | null;
    totalOrders: number;
    totalOrdersChangePercent: number | null;
    avgOrderValue: number;
    avgOrderValueChangePercent: number | null;
    activeBranchCount: number;
    totalBranchCount: number;
    membershipExpiringBranchCount: number;
    trend: RevenueTrendPoint[];
    paymentMethods: PaymentMethodBreakdown[];
    branchPerformance: BranchPerformanceRow[];
}

// Şube Genel Bakış (GET /stats/dashboard). "Bugün" şubenin yerel günüdür.
export type DashboardCardId = 'revenue' | 'live' | 'pending' | 'overdue' | 'tables' | 'hourly' | 'reservations' | 'top';

export interface DashboardStats {
    generatedAt: string;
    revenue: {
        today: number;
        cash: number;
        card: number;
        other: number;
        sameTimeYesterday: number;
        changePercent: number | null;
        closedBills: number;
        avgBill: number;
    };
    live: {
        occupiedTables: number;
        totalTables: number;
        openOrders: number;
        kitchenPending: number;
        longestOpenTableName: string | null;
        longestOpenSince: string | null;
    };
    pending: {
        orderRequests: number;
        oldestOrderRequestAt: string | null;
        orderRequestTables: string[];
        reservationRequests: number;
        reservationRequestTimes: string[];
        uncountedShifts: number;
        uncountedRegisters: string[];
    };
    regions: {
        id: string;
        name: string;
        tables: {
            id: string;
            name: string;
            /** 1 boş, 2 dolu, 3 rezerve, 4 hizmet dışı */
            status: number;
            occupiedSince: string | null;
            activeOrderTotal: number;
            nextReservationTime: string | null;
            nextReservationGuest: string | null;
        }[];
    }[];
    hourly: { hour: number; today: number; lastWeek: number }[];
    reservations: {
        id: string;
        time: string;
        guestName: string;
        partySize: number;
        tableName: string;
        /** 1 rezerve (personel), 3 onay bekliyor, 4 onaylı */
        status: number;
    }[];
    topToday: DashboardTopProduct[];
    topWeek: DashboardTopProduct[];
    /** Hazırlanma süresini aşmış, hâlâ hazır olmayan kalemler; en çok geciken önce. */
    overdue: OverdueOrderItem[];
}

/** Hem Genel Bakış kartı hem canlı "OrderItemsOverdue" uyarısı bu şekli kullanır. */
export interface OverdueOrderItem {
    orderItemId: string;
    orderId: string;
    tableId: string;
    tableName: string;
    productName: string;
    quantity: number;
    prepMinutes: number;
    createdAt: string;
    dueAt: string;
}

export interface DashboardTopProduct {
    name: string;
    sold: number;
    revenue: number;
}
