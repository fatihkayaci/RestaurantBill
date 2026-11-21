import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronRight } from 'lucide-react';
import type { DashboardCardId, DashboardStats } from '../types';
import { CARD_META } from '../dashboardCards';
import { revenueParts } from '../revenueBreakdown';
import DashboardTables from './tables/DashboardTables';
import { formatCurrency, formatElapsed, formatPercentChange } from '@/lib/format';
import { chartTooltipProps } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';

type Stats = DashboardStats;

const sectionTitle = 'text-xs font-bold uppercase tracking-[0.08em] text-rb-text-sub';

function Card({ title, aside, className, children }: { title: string; aside?: ReactNode; className?: string; children: ReactNode }) {
    return (
        <section className={cn('flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-5', className)}>
            <div className="flex min-h-6 items-center justify-between gap-3">
                <h2 className={sectionTitle}>{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-rb-text-sub">{children}</p>;
}

function RevenueCard({ stats }: { stats: Stats }) {
    const r = stats.revenue;
    const parts = revenueParts(r);
    const change = r.changePercent;
    return (
        <Card title={CARD_META.revenue.title}>
            <div>
                <p className="font-serif text-[44px] font-bold leading-none text-foreground">{formatCurrency(r.today)}</p>
                <p className={cn(
                    'mt-1.5 text-[13px] font-semibold',
                    change === null ? 'text-rb-text-sub' : change >= 0 ? 'text-rb-green' : 'text-rb-red'
                )}>
                    {change === null
                        ? `Dün bu saatte ${formatCurrency(r.sameTimeYesterday)}`
                        : `${formatPercentChange(change)} · dün bu saatte ${formatCurrency(r.sameTimeYesterday)}`}
                </p>
            </div>
            <div className="flex h-2 overflow-hidden rounded bg-muted" aria-hidden="true">
                {parts.map(p => p.amount > 0 && (
                    <span key={p.key} className={p.bar} style={{ width: `${(p.amount / r.today) * 100}%` }} />
                ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" aria-label="Ödeme yöntemine göre">
                {parts.map(p => (
                    <li key={p.key} className={p.amount > 0 ? 'text-foreground' : 'text-rb-text-muted'}>
                        <span className={p.amount > 0 ? p.dot : 'text-rb-text-muted'} aria-hidden="true">●</span> {p.label}{' '}
                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                    </li>
                ))}
            </ul>
            <p className="text-xs text-rb-text-sub">
                {r.closedBills > 0 ? `${r.closedBills} hesap kapandı · ort. ${formatCurrency(r.avgBill)}` : 'Bugün henüz hesap kapanmadı.'}
            </p>
        </Card>
    );
}

function PendingCard({ stats, now }: { stats: Stats; now: number }) {
    const p = stats.pending;
    const rows = [
        p.orderRequests > 0 && {
            key: 'qr', count: p.orderRequests, to: '/admin/tables', title: 'QR sipariş isteği',
            sub: `${p.orderRequestTables.join(', ')}${p.oldestOrderRequestAt ? ` · en eskisi ${formatElapsed(p.oldestOrderRequestAt, now)}` : ''}`,
            badge: 'bg-rb-gold text-rb-gold-foreground',
        },
        p.reservationRequests > 0 && {
            key: 'res', count: p.reservationRequests, to: '/admin/reservations', title: 'Rezervasyon isteği',
            sub: p.reservationRequestTimes.join(', '),
            badge: 'bg-rb-accent-bg text-rb-accent',
        },
        p.uncountedShifts > 0 && {
            key: 'shift', count: p.uncountedShifts, to: '/admin/shifts', title: 'Sayım bekleyen vardiya',
            sub: p.uncountedRegisters.join(', '),
            badge: 'bg-rb-orange-bg text-rb-orange',
        },
    ].filter(Boolean) as { key: string; count: number; to: string; title: string; sub: string; badge: string }[];
    const total = rows.reduce((s, r) => s + r.count, 0);

    return (
        <Card
            title={CARD_META.pending.title}
            className={total > 0 ? 'border-rb-gold/60' : undefined}
            aside={total > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rb-gold px-1.5 text-xs font-bold text-rb-gold-foreground">{total}</span>
            )}
        >
            {rows.length === 0 ? (
                <Empty>Bekleyen iş yok.</Empty>
            ) : (
                <div className="flex flex-col gap-2">
                    {rows.map(row => (
                        <Link key={row.key} to={row.to} className="flex min-h-13 items-center gap-3 rounded-[10px] bg-background px-2.5 py-2 transition-colors hover:bg-muted">
                            <span className={cn('flex h-8 min-w-8 items-center justify-center rounded-lg text-sm font-bold', row.badge)}>{row.count}</span>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-sm font-semibold text-foreground">{row.title}</span>
                                {row.sub && <span className="truncate text-xs text-rb-text-sub">{row.sub}</span>}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-rb-text-sub" aria-hidden="true" />
                        </Link>
                    ))}
                </div>
            )}
        </Card>
    );
}

function HourlyCard({ stats }: { stats: Stats }) {
    const active = stats.hourly.filter(h => h.today > 0 || h.lastWeek > 0).map(h => h.hour);
    // Boş günde de okunur bir aralık: en az 11:00–22:00, veri varsa onu kapsayacak kadar genişler.
    const from = Math.min(11, ...active);
    const to = Math.max(22, ...active);
    const data = stats.hourly
        .filter(h => h.hour >= from && h.hour <= to)
        .map(h => ({ saat: `${String(h.hour).padStart(2, '0')}`, bugun: h.today, gecen: h.lastWeek }));
    const weekday = new Date().toLocaleDateString('tr-TR', { weekday: 'long' });

    return (
        <Card
            title={CARD_META.hourly.title}
            aside={
                <div className="flex gap-4 text-xs text-rb-text-sub">
                    <span><span className="text-rb-amber">■</span> Bugün</span>
                    <span><span className="text-rb-text-muted">■</span> Geçen {weekday}</span>
                </div>
            }
        >
            {active.length === 0 ? (
                <Empty>Bugün ve geçen hafta bu gün henüz satış yok.</Empty>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="saat" tick={{ fontSize: 12, fill: 'var(--rb-text-sub)' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--rb-text-sub)' }} tickLine={false} axisLine={false} width={56}
                            tickFormatter={(v: number) => formatCurrency(v)} />
                        <Tooltip
                            {...chartTooltipProps}
                            labelFormatter={label => `${label}:00 – ${label}:59`}
                            formatter={(value, name) => [formatCurrency(Number(value)), name === 'bugun' ? 'Bugün' : `Geçen ${weekday}`]}
                        />
                        <Bar dataKey="gecen" fill="var(--rb-text-muted)" fillOpacity={0.45} radius={[3, 3, 0, 0]} maxBarSize={16} />
                        <Bar dataKey="bugun" fill="var(--rb-amber)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}

const RESERVATION_STATUS: Record<number, { label: string; cls: string }> = {
    1: { label: 'Rezerve', cls: 'bg-rb-accent-bg text-rb-accent' },
    3: { label: 'Onay bekliyor', cls: 'bg-rb-gold-bg text-rb-amber' },
    4: { label: 'Onaylı', cls: 'bg-rb-accent-bg text-rb-accent' },
};

function ReservationsCard({ stats }: { stats: Stats }) {
    return (
        <Card
            title={CARD_META.reservations.title}
            aside={<Link to="/admin/reservations" className="text-[13px] font-semibold text-rb-amber hover:underline">Tümü</Link>}
        >
            {stats.reservations.length === 0 ? (
                <Empty>Bugün rezervasyon yok.</Empty>
            ) : (
                <ul className="flex flex-col">
                    {stats.reservations.slice(0, 6).map(r => {
                        const status = RESERVATION_STATUS[r.status];
                        return (
                            <li key={r.id} className="flex items-center gap-3 border-b border-border py-2 last:border-b-0">
                                <span className="w-12 text-sm font-bold text-foreground">{r.time}</span>
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-sm font-medium text-foreground">{r.guestName}</span>
                                    <span className="truncate text-xs text-rb-text-sub">{r.partySize > 0 ? `${r.partySize} kişi · ` : ''}{r.tableName}</span>
                                </span>
                                {status && <span className={cn('rounded-md px-2 py-1 text-xs font-bold', status.cls)}>{status.label}</span>}
                            </li>
                        );
                    })}
                    {stats.reservations.length > 6 && (
                        <li className="pt-2 text-xs text-rb-text-sub">+{stats.reservations.length - 6} rezervasyon daha</li>
                    )}
                </ul>
            )}
        </Card>
    );
}

function TopCard({ stats }: { stats: Stats }) {
    const [period, setPeriod] = useState<'today' | 'week'>('today');
    const items = period === 'today' ? stats.topToday : stats.topWeek;
    const max = Math.max(1, ...items.map(p => p.sold));
    const toggle = (
        <div role="group" aria-label="Dönem" className="flex gap-0.5 rounded-lg bg-muted p-[3px]">
            {(['today', 'week'] as const).map(key => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={period === key}
                    onClick={() => setPeriod(key)}
                    className={cn(
                        'h-7.5 rounded-md px-3 text-xs font-semibold transition-colors',
                        period === key ? 'bg-card text-foreground shadow-sm' : 'text-rb-text-sub hover:text-foreground'
                    )}
                >
                    {key === 'today' ? 'Bugün' : 'Son 7 gün'}
                </button>
            ))}
        </div>
    );

    return (
        <Card title={CARD_META.top.title} aside={toggle}>
            {items.length === 0 ? (
                <Empty>{period === 'today' ? 'Bugün henüz satış yok.' : 'Son 7 günde satış yok.'}</Empty>
            ) : (
                <ol className="flex flex-col gap-3">
                    {items.map((p, i) => (
                        <li key={p.name} className="flex flex-col gap-1">
                            <div className="flex justify-between gap-3 text-sm">
                                <span className="truncate text-foreground"><span className="font-semibold text-rb-text-sub">{i + 1}</span>  {p.name}</span>
                                <span className="shrink-0 text-rb-text-sub">{p.sold} adet · {formatCurrency(p.revenue)}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                                <div className="h-full bg-rb-gold" style={{ width: `${(p.sold / max) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}

export function DashboardCard({ id, stats, now, onRefresh }: { id: DashboardCardId; stats: Stats; now: number; onRefresh: () => void }) {
    switch (id) {
        case 'revenue': return <RevenueCard stats={stats} />;
        case 'pending': return <PendingCard stats={stats} now={now} />;
        case 'tables': return <DashboardTables stats={stats} onRefresh={onRefresh} />;
        case 'hourly': return <HourlyCard stats={stats} />;
        case 'reservations': return <ReservationsCard stats={stats} />;
        case 'top': return <TopCard stats={stats} />;
    }
}
