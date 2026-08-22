import type { AuditLog } from '@/features/auditLogs/types';
import type { BranchPerformanceRow, OwnerDashboardData, PaymentMethodBreakdown, RevenueTrendPoint } from '@/features/dashboard/types';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

interface MockBranch {
    id: string;
    name: string;
    domain: string;
    baseRevenue: number;
    amplitude: number;
    phase: number;
}

const BRANCHES: MockBranch[] = [
    { id: 'tarabya', name: 'Tarabya', domain: 'tarabya.sophram.com', baseRevenue: 45000, amplitude: 9000, phase: 0 },
    { id: 'besiktas', name: 'Beşiktaş', domain: 'besiktas.sophram.com', baseRevenue: 40000, amplitude: 7000, phase: 1 },
    { id: 'kadikoy', name: 'Kadıköy', domain: 'kadikoy.sophram.com', baseRevenue: 34000, amplitude: 6000, phase: 2 },
    { id: 'uskudar', name: 'Üsküdar', domain: 'uskudar.sophram.com', baseRevenue: 24000, amplitude: 5000, phase: 3 },
    { id: 'sariyer', name: 'Sarıyer', domain: 'sariyer.sophram.com', baseRevenue: 13000, amplitude: 3000, phase: 4 },
];

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function generateTrend(days: number): RevenueTrendPoint[] {
    const points: RevenueTrendPoint[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const byBranch: Record<string, number> = {};
        let total = 0;

        for (const branch of BRANCHES) {
            const wave = Math.sin((i + branch.phase) / (days / 6)) * branch.amplitude;
            const drift = ((days - i) / days) * branch.amplitude * 0.4;
            const value = Math.max(0, Math.round(branch.baseRevenue + wave + drift));
            byBranch[branch.id] = value;
            total += value;
        }

        points.push({ date: toISODate(date), total, byBranch });
    }

    return points;
}

const paymentMethodAmounts: Array<Pick<PaymentMethodBreakdown, 'method' | 'amount'>> = [
    { method: 'Kart', amount: 92180 },
    { method: 'Nakit', amount: 61340 },
    { method: 'Qr', amount: 30730 },
];
const paymentMethodTotal = paymentMethodAmounts.reduce((sum, r) => sum + r.amount, 0);
const paymentMethods: PaymentMethodBreakdown[] = paymentMethodAmounts.map(row => ({
    ...row,
    percent: Math.round((row.amount / paymentMethodTotal) * 1000) / 10,
}));

const branchPerformance: BranchPerformanceRow[] = [
    { branchId: 'tarabya', branchName: 'Tarabya', domain: 'tarabya.sophram.com', status: 'open', todayRevenue: 52430, todayRevenueChangePercent: 14.2, todayOrders: 382, todayOrdersChangePercent: 9.1, avgBasket: 136.90, staffCount: 14, openTables: 18, totalTables: 32, pendingOrders: 5 },
    { branchId: 'besiktas', branchName: 'Beşiktaş', domain: 'besiktas.sophram.com', status: 'open', todayRevenue: 47210, todayRevenueChangePercent: 10.3, todayOrders: 341, todayOrdersChangePercent: 7.8, avgBasket: 138.40, staffCount: 11, openTables: 14, totalTables: 28, pendingOrders: 3 },
    { branchId: 'kadikoy', branchName: 'Kadıköy', domain: 'kadikoy.sophram.com', status: 'open', todayRevenue: 41020, todayRevenueChangePercent: 6.7, todayOrders: 298, todayOrdersChangePercent: 5.2, avgBasket: 137.65, staffCount: 9, openTables: 12, totalTables: 24, pendingOrders: 2 },
    { branchId: 'uskudar', branchName: 'Üsküdar', domain: 'uskudar.sophram.com', status: 'closed', todayRevenue: 28360, todayRevenueChangePercent: -8.4, todayOrders: 193, todayOrdersChangePercent: -6.1, avgBasket: 145.70, staffCount: 7, openTables: 0, totalTables: 20, pendingOrders: 0 },
    { branchId: 'sariyer', branchName: 'Sarıyer', domain: 'sariyer.sophram.com', status: 'open', todayRevenue: 15230, todayRevenueChangePercent: 4.2, todayOrders: 70, todayOrdersChangePercent: 3.0, avgBasket: 217.57, staffCount: 5, openTables: 7, totalTables: 16, pendingOrders: 1 },
    { branchId: 'bakirkoy', branchName: 'Bakırköy', domain: 'bakirkoy.sophram.com', status: 'expired', todayRevenue: 0, todayRevenueChangePercent: 0, todayOrders: 0, todayOrdersChangePercent: 0, avgBasket: 0, staffCount: 0, openTables: 0, totalTables: 18, pendingOrders: 0 },
];

const recentAuditLogs: AuditLog[] = [
    { id: '1', branchId: 'tarabya', branchName: 'Tarabya', actorName: 'Sistem', category: 2, severity: 2, action: 'OrderCancelled', message: 'Sipariş iptal edildi', entityType: 'Order', entityId: '1258', createdAt: minutesAgo(2) },
    { id: '2', branchId: 'besiktas', branchName: 'Beşiktaş', actorName: 'Ahmet Y.', category: 4, severity: 2, action: 'StaffDeleted', message: 'Personel silindi', entityType: 'User', entityId: null, createdAt: minutesAgo(18) },
    { id: '3', branchId: 'kadikoy', branchName: 'Kadıköy', actorName: 'Sistem', category: 5, severity: 1, action: 'ProductUpdated', message: 'Menü güncellendi: Burger Menü', entityType: 'Product', entityId: null, createdAt: minutesAgo(32) },
    { id: '4', branchId: 'tarabya', branchName: 'Tarabya', actorName: 'Sistem', category: 1, severity: 3, action: 'LoginFailed', message: 'Başarısız giriş denemesi: IP 85.***.***.23', entityType: null, entityId: null, createdAt: minutesAgo(60) },
    { id: '5', branchId: 'uskudar', branchName: 'Üsküdar', actorName: 'Sistem', category: 6, severity: 1, action: 'TableClosed', message: 'Masa kapatıldı: Masa #7', entityType: 'Table', entityId: null, createdAt: minutesAgo(60) },
];

export const ownerDashboardMock: OwnerDashboardData = {
    stats: {
        totalRevenue: 184250,
        totalRevenueChangePercent: 12.4,
        totalOrders: 1284,
        totalOrdersChangePercent: 8.2,
        avgOrderValue: 143.35,
        avgOrderValueChangePercent: 3.1,
        activeBranchCount: 5,
        totalBranchCount: 6,
    },
    membershipWarning: {
        expiringBranchCount: 2,
        withinDays: 7,
    },
    trend: {
        7: generateTrend(7),
        30: generateTrend(30),
        90: generateTrend(90),
    },
    paymentMethods,
    branchPerformance,
    recentAuditLogs,
};

export const trendBranches = BRANCHES.map(b => ({ id: b.id, name: b.name }));
