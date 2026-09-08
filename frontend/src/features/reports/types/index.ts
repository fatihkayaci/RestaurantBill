import type { Shift } from '@/features/cashier/types';
import type { PaymentMethodBreakdown } from '@/features/stats/types';

export interface ReportFilterParams {
    from: string; // yyyy-MM-dd
    to: string;   // yyyy-MM-dd
    branchId?: string;
}

export interface SalesTrendPoint {
    label: string;
    total: number;
    byBranch: Record<string, number>;
}

export interface SalesHeatmapPoint {
    dayOfWeek: number; // 0 = Pazartesi ... 6 = Pazar
    hour: number;
    amount: number;
    count: number;
}

export interface BranchSalesRow {
    branchId: string;
    branchName: string;
    revenue: number;
    transactionCount: number;
    avgBasket: number;
    revenueChangePercent: number;
}

export interface SalesReport {
    totalRevenue: number;
    totalMatrah: number;
    totalTax: number;
    transactionCount: number;
    avgBasket: number;
    trend: SalesTrendPoint[];
    paymentMethods: PaymentMethodBreakdown[];
    heatmap: SalesHeatmapPoint[];
    branchComparison: BranchSalesRow[];
}

export interface BranchShiftSummaryRow {
    branchId: string;
    branchName: string;
    shiftCount: number;
    totalDifference: number;
    uncountedCount: number;
    autoClosedCount: number;
}

export interface ShiftReport {
    totalDifference: number;
    uncountedCount: number;
    autoClosedCount: number;
    pendingReviewCount: number;
    shifts: Shift[];
    branchSummaries: BranchShiftSummaryRow[];
}
