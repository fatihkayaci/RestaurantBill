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
    todayRevenueChangePercent: number;
    todayOrders: number;
    todayOrdersChangePercent: number;
    avgBasket: number;
    staffCount: number;
    openTables: number;
    totalTables: number;
    pendingOrders: number;
}

export interface OwnerDashboardStats {
    totalRevenue: number;
    totalRevenueChangePercent: number;
    totalOrders: number;
    totalOrdersChangePercent: number;
    avgOrderValue: number;
    avgOrderValueChangePercent: number;
    activeBranchCount: number;
    totalBranchCount: number;
    membershipExpiringBranchCount: number;
    trend: RevenueTrendPoint[];
    paymentMethods: PaymentMethodBreakdown[];
    branchPerformance: BranchPerformanceRow[];
}
