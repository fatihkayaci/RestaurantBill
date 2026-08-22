import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, ShoppingCart, ShoppingBag, Building2, RefreshCw, AlertTriangle, X,
    ArrowUpRight, ArrowDownRight, ArrowRight, ChevronRight, Plus, UserCog, Palette, CreditCard,
    Calendar, ChevronDown, Table2,
    type LucideIcon,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { ownerDashboardMock } from '@/features/dashboard/mock/ownerDashboardMock';
import { SEVERITY_LABELS, SEVERITY_STYLE } from '@/features/auditLogs/constants';
import type { BranchOperationalStatus } from '@/features/dashboard/types';

const formatCurrency = (value: number, decimals = 0) =>
    `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const formatChange = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const minutesAgoLabel = (iso: string) => {
    const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
    return minutes < 60 ? `${minutes} dakika önce` : `${Math.round(minutes / 60)} saat önce`;
};

const STATUS_LABEL: Record<BranchOperationalStatus, string> = {
    open: 'Açık', closed: 'Kapalı', expired: 'Süresi Doldu',
};
const STATUS_STYLE: Record<BranchOperationalStatus, string> = {
    open: 'bg-rb-green-bg text-rb-green border border-rb-green/30',
    closed: 'bg-rb-neutral-bg text-rb-neutral border border-rb-neutral/30',
    expired: 'bg-rb-red-bg text-rb-red border border-rb-red/30',
};

const TREND_SERIES = [
    { key: 'total', label: 'Tümü', color: 'var(--foreground)' },
    { key: 'tarabya', label: 'Tarabya', color: 'var(--rb-orange)' },
    { key: 'besiktas', label: 'Beşiktaş', color: 'var(--rb-accent)' },
    { key: 'kadikoy', label: 'Kadıköy', color: 'var(--rb-green)' },
    { key: 'uskudar', label: 'Üsküdar', color: 'var(--rb-purple)' },
    { key: 'sariyer', label: 'Sarıyer', color: 'var(--rb-gold)' },
] as const;

const PAYMENT_COLOR: Record<string, string> = {
    Kart: 'var(--rb-accent)',
    Nakit: 'var(--rb-green)',
    Qr: 'var(--rb-gold)',
};
const PAYMENT_LABEL: Record<string, string> = { Kart: 'Kart', Nakit: 'Nakit', Qr: 'QR / Mobil' };

const QUICK_ACTIONS = [
    { label: 'Şube Ekle', icon: Plus, to: '/owner/branches', color: 'text-rb-accent bg-rb-accent-bg' },
    { label: 'Admin Ata', icon: UserCog, to: '/owner/admins', color: 'text-rb-purple bg-rb-purple-bg' },
    { label: 'Marka Ayarları', icon: Palette, to: '/owner/branding', color: 'text-rb-gold bg-rb-gold-bg' },
    { label: 'Abonelik & Faturalar', icon: CreditCard, to: '/owner/membership', color: 'text-rb-green bg-rb-green-bg' },
] as const;

const todayLabel = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

function ChangeCaption({ value, caption }: { value: number; caption?: string }) {
    const positive = value >= 0;
    return (
        <p className={cn('flex items-center gap-1 text-xs mt-1', positive ? 'text-rb-green' : 'text-rb-red')}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {formatChange(value)}
            {caption && <span className="text-muted-foreground">{caption}</span>}
        </p>
    );
}

function StatCard({ icon: Icon, colorBg, colorText, label, value, change, caption }: {
    icon: LucideIcon; colorBg: string; colorText: string; label: string; value: string; change: number; caption: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
                <div className={cn('w-11 h-11 rounded-lg flex items-center justify-center shrink-0', colorBg)}>
                    <Icon className={cn('w-5 h-5', colorText)} />
                </div>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-bold text-foreground mt-3">{value}</p>
            <ChangeCaption value={change} caption={caption} />
        </div>
    );
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const [range, setRange] = useState<7 | 30 | 90>(7);
    const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
    const [bannerVisible, setBannerVisible] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { stats, membershipWarning, trend, paymentMethods, branchPerformance, recentAuditLogs } = ownerDashboardMock;

    const chartData = useMemo(() => trend[range].map(point => ({
        date: new Date(point.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
        total: point.total,
        ...point.byBranch,
    })), [trend, range]);

    const toggleSeries = (key: string) => {
        setHiddenSeries(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
    };

    const paymentTotal = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
    const activeRatio = stats.totalBranchCount > 0 ? (stats.activeBranchCount / stats.totalBranchCount) * 100 : 0;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-foreground">Owner Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Şirket genelinizin özet performansı</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {todayLabel}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Membership warning */}
            {bannerVisible && membershipWarning.expiringBranchCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rb-amber/30 bg-rb-amber-bg px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-rb-amber shrink-0" />
                        <div>
                            <span className="text-sm font-semibold text-foreground">Üyelik Uyarısı </span>
                            <span className="text-sm text-muted-foreground">
                                {membershipWarning.expiringBranchCount} şubenizin üyeliği {membershipWarning.withinDays} gün içinde sona erecek. Lütfen yenilemeyi unutmayın.
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate('/owner/membership')}
                            className="rounded-lg border border-rb-amber/40 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
                        >
                            Detayları Görüntüle
                        </button>
                        <button type="button" onClick={() => setBannerVisible(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={TrendingUp} colorBg="bg-rb-green-bg" colorText="text-rb-green"
                    label="Toplam Ciro" value={formatCurrency(stats.totalRevenue, 2)}
                    change={stats.totalRevenueChangePercent} caption="düne göre"
                />
                <StatCard
                    icon={ShoppingCart} colorBg="bg-rb-accent-bg" colorText="text-rb-accent"
                    label="Toplam Sipariş" value={stats.totalOrders.toLocaleString('tr-TR')}
                    change={stats.totalOrdersChangePercent} caption="geçen haftaya göre"
                />
                <StatCard
                    icon={ShoppingBag} colorBg="bg-rb-purple-bg" colorText="text-rb-purple"
                    label="Ortalama Sepet" value={formatCurrency(stats.avgOrderValue, 2)}
                    change={stats.avgOrderValueChangePercent} caption="geçen haftaya göre"
                />
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-rb-orange-bg flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-rb-orange" />
                        </div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Aktif Şube Sayısı</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-3">{stats.activeBranchCount} / {stats.totalBranchCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">%{activeRatio.toFixed(1)} aktiflik oranı</p>
                </div>
            </div>

            {/* Trend + Payment methods */}
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Ciro Trendi</p>
                        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                            {([7, 30, 90] as const).map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setRange(d)}
                                    className={cn(
                                        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                                        range === d ? 'bg-rb-accent text-white' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {d} Gün
                                </button>
                            ))}
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            {TREND_SERIES.filter(series => !hiddenSeries.has(series.key)).map(series => (
                                <Line
                                    key={series.key}
                                    type="monotone"
                                    dataKey={series.key}
                                    name={series.label}
                                    stroke={series.color}
                                    strokeWidth={series.key === 'total' ? 2.5 : 2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        {TREND_SERIES.map(series => (
                            <button
                                key={series.key}
                                type="button"
                                onClick={() => toggleSeries(series.key)}
                                className={cn(
                                    'flex items-center gap-1.5 text-xs font-medium transition-opacity',
                                    hiddenSeries.has(series.key) ? 'opacity-40' : 'opacity-100'
                                )}
                            >
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                                {series.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">Ödeme Yöntemleri</p>
                    <div className="relative">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={paymentMethods}
                                    dataKey="amount"
                                    nameKey="method"
                                    innerRadius={55}
                                    outerRadius={80}
                                    paddingAngle={2}
                                >
                                    {paymentMethods.map(p => <Cell key={p.method} fill={PAYMENT_COLOR[p.method]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-lg font-bold text-foreground">{formatCurrency(paymentTotal)}</p>
                            <p className="text-[10px] text-muted-foreground">Toplam Ciro</p>
                        </div>
                    </div>
                    <div className="space-y-2.5 mt-4">
                        {paymentMethods.map(p => (
                            <div key={p.method} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PAYMENT_COLOR[p.method] }} />
                                    <span className="text-foreground">{PAYMENT_LABEL[p.method]}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-foreground font-medium">{formatCurrency(p.amount)}</p>
                                    <p className="text-xs text-muted-foreground">%{p.percent}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Branch performance + right column */}
            <div className="grid lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Şube Performansı (Bugün)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Şube</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Durum</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Ciro</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Sipariş</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Ort. Sepet</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Çalışan</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Masa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchPerformance.map(row => (
                                    <tr key={row.branchId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-foreground whitespace-nowrap">{row.branchName}</p>
                                            <p className="text-xs text-muted-foreground">{row.domain}</p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_STYLE[row.status])}>
                                                {STATUS_LABEL[row.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {row.status === 'expired' ? (
                                                <span className="text-muted-foreground">—</span>
                                            ) : (
                                                <>
                                                    <p className="text-foreground font-medium whitespace-nowrap">{formatCurrency(row.todayRevenue)}</p>
                                                    <ChangeCaption value={row.todayRevenueChangePercent} />
                                                </>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {row.status === 'expired' ? (
                                                <span className="text-muted-foreground">—</span>
                                            ) : (
                                                <>
                                                    <p className="text-foreground font-medium">{row.todayOrders}</p>
                                                    <ChangeCaption value={row.todayOrdersChangePercent} />
                                                </>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                                            {row.status === 'expired' ? '—' : formatCurrency(row.avgBasket, 2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-foreground">{row.status === 'expired' ? '—' : row.staffCount}</td>
                                        <td className="px-4 py-3.5">
                                            <p className="text-foreground whitespace-nowrap">{row.openTables} / {row.totalTables}</p>
                                            <div className="h-1 w-16 rounded-full bg-muted mt-1 overflow-hidden">
                                                <div
                                                    className="h-full bg-rb-green"
                                                    style={{ width: `${row.totalTables > 0 ? (row.openTables / row.totalTables) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/owner/branches')}
                        className="flex items-center justify-center gap-1.5 w-full px-5 py-3 text-sm font-medium text-rb-accent hover:bg-muted/30 transition-colors border-t border-border"
                    >
                        Tüm Şubeleri Görüntüle <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Live status */}
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Şube Canlı Durumu</p>
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-rb-green">
                                <span className="h-1.5 w-1.5 rounded-full bg-rb-green animate-pulse" /> Canlı
                            </span>
                        </div>
                        <div className="space-y-3">
                            {branchPerformance.filter(b => b.status !== 'expired').map(row => (
                                <div key={row.branchId} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Table2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-foreground truncate">{row.branchName}</span>
                                        <span className="text-muted-foreground text-xs whitespace-nowrap">{row.openTables}/{row.totalTables}</span>
                                    </div>
                                    <span className={cn(
                                        'text-xs font-semibold rounded-full px-2 py-0.5 shrink-0',
                                        row.pendingOrders === 0 ? 'bg-rb-neutral-bg text-rb-neutral' : row.pendingOrders >= 4 ? 'bg-rb-red-bg text-rb-red' : 'bg-rb-amber-bg text-rb-amber'
                                    )}>
                                        {row.pendingOrders}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Hızlı Aksiyonlar</p>
                        <div className="space-y-1.5">
                            {QUICK_ACTIONS.map(action => (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => navigate(action.to)}
                                    className="flex items-center gap-3 w-full rounded-lg px-2 py-2 text-left hover:bg-muted/50 transition-colors"
                                >
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', action.color)}>
                                        <action.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground flex-1">{action.label}</span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent audit logs */}
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">Son Denetim Kayıtları</p>
                        <div className="space-y-3">
                            {recentAuditLogs.map(log => (
                                <div key={log.id} className="flex items-start justify-between gap-2 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-foreground truncate">{log.message}</p>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', SEVERITY_STYLE[log.severity])}>
                                                {SEVERITY_LABELS[log.severity]}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{log.branchName}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{minutesAgoLabel(log.createdAt)}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/owner/audit-log')}
                            className="flex items-center justify-center gap-1.5 w-full mt-4 pt-3 border-t border-border text-sm font-medium text-rb-accent hover:opacity-80 transition-opacity"
                        >
                            Tümünü Gör <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
