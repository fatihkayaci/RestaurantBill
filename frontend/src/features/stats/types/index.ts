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
// Kimlikler backend'deki DashboardCards.All ile aynı. Kayıtlı düzen eski/bilinmeyen kimlik içerebilir; dashboardCards.ts süzer.
export type DashboardCardId = 'revenue' | 'pending' | 'tables' | 'hourly' | 'reservations' | 'top';

export interface DashboardStats {
    generatedAt: string;
    revenue: {
        today: number;
        cash: number;
        card: number;
        /** QR + IBAN toplamı (eski alan; qr/iban gelmezse "Diğer" olarak gösterilir). */
        other: number;
        /** QR ile ödenen; backend eklenene kadar gelmeyebilir. */
        qr?: number;
        /** IBAN / havale ile ödenen; backend eklenene kadar gelmeyebilir. */
        iban?: number;
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
        /** En eski üç isteğin masa adı (kart metni). */
        orderRequestTables: string[];
        /** Bekleyen QR isteği olan masaların hepsi; masa haritası bununla eşler. */
        orderRequestTableIds: string[];
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
            /** Açık siparişten hesaba alınmış ödeme. */
            paidAmount: number;
            remainingAmount: number;
            billRequestedAt: string | null;
            /** Kalemler adet bazında; menü yerine içindeki ürünler sayılır. */
            kitchenItems: number;
            readyItems: number;
            servedItems: number;
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
    /** Paket siparişte null. */
    tableId: string | null;
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
