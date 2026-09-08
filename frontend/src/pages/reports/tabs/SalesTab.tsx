import { useMemo, useState } from 'react';
import { TrendingUp, ShoppingCart, ShoppingBag, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import type { SalesReport } from '@/features/reports/types';

interface Props {
    data: SalesReport | null;
    loading: boolean;
    isSingleDay: boolean;
    role: 'admin' | 'owner';
    showBranchComparison: boolean;
}

const formatCurrency = (value: number, decimals = 0) =>
    `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const formatChange = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const BRANCH_LINE_COLORS = ['var(--rb-orange)', 'var(--rb-accent)', 'var(--rb-green)', 'var(--rb-purple)', 'var(--rb-gold)', 'var(--rb-red)'];

const PAYMENT_COLOR: Record<number, string> = { 1: 'var(--rb-accent)', 2: 'var(--rb-green)', 3: 'var(--rb-gold)' };
const PAYMENT_LABEL: Record<number, string> = { 1: 'Kart', 2: 'Nakit', 3: 'QR / Mobil' };

const DOW_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function ChangeCaption({ value }: { value: number }) {
    const positive = value >= 0;
    return (
        <p className={cn('flex items-center gap-1 text-xs mt-1', positive ? 'text-rb-green' : 'text-rb-red')}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {formatChange(value)}
        </p>
    );
}

function formatTrendLabel(label: string, isSingleDay: boolean): string {
    if (isSingleDay) return `${label}:00`;
    const date = new Date(`${label}T00:00:00`);
    if (Number.isNaN(date.getTime())) return label;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

export default function SalesTab({ data, loading, isSingleDay, showBranchComparison }: Props) {
    const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

    const branchSeries = useMemo(() => {
        if (!showBranchComparison || !data) return [];
        return [
            { key: 'total', label: 'Tümü', color: 'var(--foreground)' },
            ...data.branchComparison.map((b, i) => ({ key: b.branchId, label: b.branchName, color: BRANCH_LINE_COLORS[i % BRANCH_LINE_COLORS.length] })),
        ];
    }, [data, showBranchComparison]);

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.trend.map(point => ({
            label: formatTrendLabel(point.label, isSingleDay),
            total: point.total,
            ...point.byBranch,
        }));
    }, [data, isSingleDay]);

    const heatmapMax = useMemo(() => Math.max(1, ...(data?.heatmap.map(p => p.amount) ?? [0])), [data]);
    const heatmapByCell = useMemo(() => {
        const map = new Map<string, { amount: number; count: number }>();
        for (const p of data?.heatmap ?? []) map.set(`${p.dayOfWeek}-${p.hour}`, { amount: p.amount, count: p.count });
        return map;
    }, [data]);

    const toggleSeries = (key: string) => {
        setHiddenSeries(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const paymentTotal = (data?.paymentMethods ?? []).reduce((sum, p) => sum + p.amount, 0);

    if (loading && !data) {
        return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-rb-green-bg flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-rb-green" />
                        </div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Ciro (KDV Dahil)</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-3">{formatCurrency(data?.totalRevenue ?? 0, 2)}</p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dashed border-border text-sm">
                        <span className="text-muted-foreground">Matrah <span className="text-foreground font-medium">{formatCurrency(data?.totalMatrah ?? 0, 2)}</span></span>
                        <span className="text-muted-foreground">KDV <span className="text-foreground font-medium">{formatCurrency(data?.totalTax ?? 0, 2)}</span></span>
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-rb-accent-bg flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-5 h-5 text-rb-accent" />
                        </div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">İşlem Sayısı</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-3">{(data?.transactionCount ?? 0).toLocaleString('tr-TR')}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-rb-purple-bg flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5 text-rb-purple" />
                        </div>
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Ort. Sepet</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-3">{formatCurrency(data?.avgBasket ?? 0, 2)}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">
                        {isSingleDay ? 'Saatlik Ciro' : 'Günlük Ciro'}
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                        {isSingleDay ? (
                            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                <Bar dataKey="total" fill="var(--rb-accent)" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        ) : (
                            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₺${(v / 1000).toFixed(0)}k`} />
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                {(showBranchComparison ? branchSeries : [{ key: 'total', label: 'Toplam', color: 'var(--rb-accent)' }])
                                    .filter(s => !hiddenSeries.has(s.key))
                                    .map(s => (
                                        <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={s.key === 'total' ? 2.5 : 2} dot={false} />
                                    ))}
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                    {showBranchComparison && !isSingleDay && (
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            {branchSeries.map(series => (
                                <button
                                    key={series.key}
                                    type="button"
                                    onClick={() => toggleSeries(series.key)}
                                    className={cn('flex items-center gap-1.5 text-xs font-medium transition-opacity', hiddenSeries.has(series.key) ? 'opacity-40' : 'opacity-100')}
                                >
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                                    {series.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">Ödeme Yöntemleri</p>
                    {(data?.paymentMethods.length ?? 0) === 0 ? (
                        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Bu aralıkta ödeme verisi yok.</div>
                    ) : (
                        <>
                            <div className="relative">
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={data!.paymentMethods} dataKey="amount" nameKey="method" innerRadius={50} outerRadius={72} paddingAngle={2}>
                                            {data!.paymentMethods.map(p => <Cell key={p.method} fill={PAYMENT_COLOR[p.method]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-base font-bold text-foreground">{formatCurrency(paymentTotal)}</p>
                                    <p className="text-[10px] text-muted-foreground">Toplam</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 mt-4">
                                {data!.paymentMethods.map(p => (
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
                        </>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">Saatlik Yoğunluk</p>
                <div className="overflow-x-auto">
                    <div className="min-w-[640px]">
                        <div className="grid grid-cols-[32px_repeat(24,1fr)] gap-[3px]">
                            <div />
                            {Array.from({ length: 24 }, (_, h) => (
                                <div key={h} className="text-center text-[9px] text-muted-foreground">{h % 3 === 0 ? h : ''}</div>
                            ))}
                            {DOW_LABELS.map((label, dow) => (
                                <div key={dow} className="contents">
                                    <div className="text-[10px] text-muted-foreground flex items-center">{label}</div>
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const cell = heatmapByCell.get(`${dow}-${hour}`);
                                        const intensity = cell ? Math.max(0.08, cell.amount / heatmapMax) : 0;
                                        return (
                                            <div
                                                key={hour}
                                                title={cell ? `${label} ${hour}:00 · ${formatCurrency(cell.amount)} · ${cell.count} işlem` : `${label} ${hour}:00 · veri yok`}
                                                className="aspect-square rounded-[3px]"
                                                style={{ backgroundColor: cell ? `color-mix(in srgb, var(--rb-accent) ${Math.round(intensity * 100)}%, transparent)` : 'var(--muted)' }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showBranchComparison && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border">
                        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">Şube Karşılaştırması</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-5 py-3">Şube</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Ciro</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">İşlem</th>
                                    <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-muted-foreground px-4 py-3">Ort. Sepet</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.branchComparison ?? []).map(row => (
                                    <tr key={row.branchId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3.5 font-medium text-foreground whitespace-nowrap">{row.branchName}</td>
                                        <td className="px-4 py-3.5">
                                            <p className="text-foreground font-medium whitespace-nowrap">{formatCurrency(row.revenue)}</p>
                                            <ChangeCaption value={row.revenueChangePercent} />
                                        </td>
                                        <td className="px-4 py-3.5 text-foreground">{row.transactionCount}</td>
                                        <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{formatCurrency(row.avgBasket, 2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
