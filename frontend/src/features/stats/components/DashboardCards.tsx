import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronRight } from 'lucide-react';
import type { DashboardCardId, DashboardStats } from '../types';
import { CARD_META } from '../dashboardCards';
import { formatCurrency, formatElapsed, formatMinutes, formatPercentChange } from '@/lib/format';
import { chartTooltipProps } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';

type Stats = DashboardStats;

/** Bir masa bu süreden uzun açıksa haritada kırmızı görünür. */
const LONG_OPEN_MINUTES = 60;

const sectionTitle = 'text-[11px] font-bold uppercase tracking-[0.08em] text-rb-text-sub';

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
    const cashPct = r.today > 0 ? (r.cash / r.today) * 100 : 0;
    const cardPct = r.today > 0 ? (r.card / r.today) * 100 : 0;
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
                <span className="bg-rb-amber" style={{ width: `${cashPct}%` }} />
                <span className="bg-rb-accent" style={{ width: `${cardPct}%` }} />
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-[13px] text-foreground">
                <span><span className="text-rb-amber">●</span> Nakit {formatCurrency(r.cash)}</span>
                <span><span className="text-rb-accent">●</span> Kart {formatCurrency(r.card)}</span>
                {r.other > 0 && <span className="text-rb-text-sub">QR / IBAN {formatCurrency(r.other)}</span>}
            </div>
            <p className="text-xs text-rb-text-sub">
                {r.closedBills > 0 ? `${r.closedBills} hesap kapandı · ort. ${formatCurrency(r.avgBill)}` : 'Bugün henüz hesap kapanmadı.'}
            </p>
        </Card>
    );
}

function LiveCard({ stats, now }: { stats: Stats; now: number }) {
    const l = stats.live;
    const pct = l.totalTables > 0 ? Math.round((l.occupiedTables / l.totalTables) * 100) : 0;
    const tile = 'rounded-xl bg-background p-3 transition-colors hover:bg-muted';
    return (
        <Card title={CARD_META.live.title} aside={<span className="text-xs font-semibold text-rb-green">● Canlı</span>}>
            <div className="grid grid-cols-3 gap-2.5">
                <Link to="/admin/tables" className={tile}>
                    <p className="font-serif text-[30px] font-bold leading-none text-foreground">
                        {l.occupiedTables}<span className="text-lg text-rb-text-sub">/{l.totalTables}</span>
                    </p>
                    <p className="mt-1 text-xs text-rb-text-sub">Dolu masa</p>
                </Link>
                <Link to="/admin/tables" className={tile}>
                    <p className="font-serif text-[30px] font-bold leading-none text-foreground">{l.openOrders}</p>
                    <p className="mt-1 text-xs text-rb-text-sub">Açık sipariş</p>
                </Link>
                <div className={cn('rounded-xl p-3', l.kitchenPending > 0 ? 'bg-rb-orange-bg' : 'bg-background')}>
                    <p className={cn('font-serif text-[30px] font-bold leading-none', l.kitchenPending > 0 ? 'text-rb-orange' : 'text-foreground')}>{l.kitchenPending}</p>
                    <p className={cn('mt-1 text-xs', l.kitchenPending > 0 ? 'text-rb-orange' : 'text-rb-text-sub')}>Mutfakta</p>
                </div>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted" aria-hidden="true">
                <div className="h-full bg-rb-gold" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-rb-text-sub">
                %{pct} doluluk
                {l.longestOpenTableName && l.longestOpenSince && ` · en uzun açık masa: ${l.longestOpenTableName} (${formatElapsed(l.longestOpenSince, now)})`}
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

function TablesCard({ stats, now }: { stats: Stats; now: number }) {
    const legend = (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rb-text-sub">
            <span><span className="text-rb-text-muted">■</span> Boş</span>
            <span><span className="text-rb-amber">■</span> Dolu</span>
            <span><span className="text-rb-red">■</span> 1 saati geçti</span>
            <span><span className="text-rb-accent">■</span> Rezerve</span>
            <Link to="/admin/tables" className="font-semibold text-rb-amber hover:underline">Masalara git</Link>
        </div>
    );
    const regions = stats.regions.filter(r => r.tables.length > 0);

    return (
        <Card title={CARD_META.tables.title} aside={legend} className="[&>div:first-child]:flex-wrap">
            {regions.length === 0 ? (
                <Empty>Henüz masa yok. <Link to="/admin/tables" className="ml-1 font-semibold text-rb-amber hover:underline">Masa ekle</Link></Empty>
            ) : (
                <div className="flex flex-col gap-3.5">
                    {regions.map(region => (
                        <div key={region.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                            <span className="text-[13px] font-semibold text-foreground sm:w-20 sm:shrink-0 sm:pt-4">{region.name}</span>
                            <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
                                {region.tables.map(table => {
                                    const minutes = table.occupiedSince ? (now - new Date(table.occupiedSince).getTime()) / 60000 : 0;
                                    const kind = table.status === 2
                                        ? (minutes >= LONG_OPEN_MINUTES ? 'long' : 'busy')
                                        : table.status === 3 ? 'reserved' : table.status === 4 ? 'off' : 'empty';
                                    const line = table.status === 2
                                        ? `${table.occupiedSince ? formatElapsed(table.occupiedSince, now) : 'Açık'} · ${formatCurrency(table.activeOrderTotal)}`
                                        : table.status === 3
                                            ? (table.nextReservationTime ? `${table.nextReservationTime} ${table.nextReservationGuest ?? ''}`.trim() : 'Rezerve')
                                            : table.status === 4
                                                ? 'Hizmet dışı'
                                                : (table.nextReservationTime ? `Boş · ${table.nextReservationTime} rez.` : 'Boş');
                                    return (
                                        <Link
                                            key={table.id}
                                            to={`/admin/tables?table=${table.id}`}
                                            className={cn(
                                                'flex min-h-14 flex-col justify-center gap-0.5 rounded-[10px] border px-2.5 py-2 transition-opacity hover:opacity-85',
                                                kind === 'empty' && 'border-border bg-background text-rb-text-sub',
                                                kind === 'busy' && 'border-rb-amber/45 bg-rb-amber-bg text-foreground',
                                                kind === 'long' && 'border-rb-red/50 bg-rb-red-bg text-rb-red',
                                                kind === 'reserved' && 'border-rb-accent/45 bg-rb-accent-bg text-rb-accent',
                                                kind === 'off' && 'border-dashed border-border text-rb-text-muted'
                                            )}
                                        >
                                            <span className="truncate text-sm font-bold">{table.name}</span>
                                            <span className="truncate text-xs">{line}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
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
                        <XAxis dataKey="saat" tick={{ fontSize: 11, fill: 'var(--rb-text-sub)' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--rb-text-sub)' }} tickLine={false} axisLine={false} width={56}
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
                                {status && <span className={cn('rounded-md px-2 py-1 text-[11px] font-bold', status.cls)}>{status.label}</span>}
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

function OverdueCard({ stats, now }: { stats: Stats; now: number }) {
    const items = stats.overdue ?? [];
    return (
        <Card
            title={CARD_META.overdue.title}
            className={items.length > 0 ? 'border-rb-red/50' : undefined}
            aside={items.length > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-rb-red px-1.5 text-xs font-bold text-rb-red-foreground">{items.length}</span>
            )}
        >
            {items.length === 0 ? (
                <Empty>Geciken sipariş yok. Süre yalnızca hazırlanma süresi girilmiş ürünler için izlenir.</Empty>
            ) : (
                <ul className="flex flex-col gap-2">
                    {items.slice(0, 6).map(item => {
                        const lateMinutes = Math.max(0, Math.floor((now - new Date(item.dueAt).getTime()) / 60000));
                        return (
                            <li key={item.orderItemId}>
                                <Link to="/admin/tables" className="flex min-h-13 items-center gap-3 rounded-[10px] bg-background px-2.5 py-2 transition-colors hover:bg-muted">
                                    <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-rb-red-bg px-1.5 text-sm font-bold text-rb-red">{item.quantity}×</span>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-sm font-semibold text-foreground">{item.productName}</span>
                                        <span className="truncate text-xs text-rb-text-sub">{item.tableName} · süre {item.prepMinutes} dk</span>
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold text-rb-red">
                                        {lateMinutes > 0 ? `${formatMinutes(lateMinutes)} gecikti` : 'süre doldu'}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                    {items.length > 6 && <li className="text-xs text-rb-text-sub">+{items.length - 6} ürün daha</li>}
                </ul>
            )}
        </Card>
    );
}

export function DashboardCard({ id, stats, now }: { id: DashboardCardId; stats: Stats; now: number }) {
    switch (id) {
        case 'revenue': return <RevenueCard stats={stats} />;
        case 'live': return <LiveCard stats={stats} now={now} />;
        case 'pending': return <PendingCard stats={stats} now={now} />;
        case 'overdue': return <OverdueCard stats={stats} now={now} />;
        case 'tables': return <TablesCard stats={stats} now={now} />;
        case 'hourly': return <HourlyCard stats={stats} />;
        case 'reservations': return <ReservationsCard stats={stats} />;
        case 'top': return <TopCard stats={stats} />;
    }
}
