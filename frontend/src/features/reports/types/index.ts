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

export interface ProductSalesRow {
    productId: string;
    productName: string;
    categoryName: string;
    sold: number;
    revenue: number;
    avgUnitPrice: number;
}

export interface CategorySalesRow {
    categoryId: string;
    categoryName: string;
    sold: number;
    revenue: number;
    percent: number;
}

export interface NeverSoldProduct {
    productId: string;
    productName: string;
    categoryName: string;
    price: number;
}

export interface ProductReport {
    products: ProductSalesRow[];
    categoryBreakdown: CategorySalesRow[];
    neverSoldProducts: NeverSoldProduct[];
}

export interface WaiterStaffRow {
    userId: string;
    userName: string;
    orderCount: number;
    revenue: number;
    avgBasket: number;
}

export interface CashierStaffRow {
    userId: string;
    userName: string;
    transactionCount: number;
    revenue: number;
    paymentMethods: PaymentMethodBreakdown[];
}

export interface StaffReport {
    waiters: WaiterStaffRow[];
    cashiers: CashierStaffRow[];
}

export interface DiscountUserRow {
    userId: string;
    userName: string;
    count: number;
    totalAmount: number;
}

export interface DiscountBucket {
    label: string;
    count: number;
    totalAmount: number;
}

export interface CancelledOrderRow {
    orderId: string;
    tableName: string;
    actorName: string;
    cancelledAt: string;
    amount: number;
}

export interface DiscountReport {
    totalDiscountAmount: number;
    grossRevenue: number;
    discountToRevenuePercent: number;
    discountedPaymentCount: number;
    noteFilledPercent: number;
    userBreakdown: DiscountUserRow[];
    percentDistribution: DiscountBucket[];
    cancelledOrders: CancelledOrderRow[];
}

export interface TaxRateRow {
    taxRatePercent: number;
    matrah: number;
    tax: number;
    total: number;
}

export interface TaxReport {
    rates: TaxRateRow[];
    totalMatrah: number;
    totalTax: number;
    totalAmount: number;
}
