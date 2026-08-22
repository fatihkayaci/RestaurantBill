import type { AuditLog } from '@/features/auditLogs/types';

export type BranchOperationalStatus = 'open' | 'closed' | 'expired';

export interface OwnerDashboardStats {
    totalRevenue: number;
    totalRevenueChangePercent: number;
    totalOrders: number;
    totalOrdersChangePercent: number;
    avgOrderValue: number;
    avgOrderValueChangePercent: number;
    activeBranchCount: number;
    totalBranchCount: number;
}

export interface RevenueTrendPoint {
    date: string;
    total: number;
    byBranch: Record<string, number>;
}

export interface PaymentMethodBreakdown {
    method: 'Kart' | 'Nakit' | 'Qr';
    amount: number;
    percent: number;
}

export interface BranchPerformanceRow {
    branchId: string;
    branchName: string;
    domain: string;
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

export interface MembershipWarning {
    expiringBranchCount: number;
    withinDays: number;
}

export interface OwnerDashboardData {
    stats: OwnerDashboardStats;
    membershipWarning: MembershipWarning;
    trend: Record<7 | 30 | 90, RevenueTrendPoint[]>;
    paymentMethods: PaymentMethodBreakdown[];
    branchPerformance: BranchPerformanceRow[];
    recentAuditLogs: AuditLog[];
}
