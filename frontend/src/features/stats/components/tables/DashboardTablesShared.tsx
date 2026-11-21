import type { ReactNode } from 'react';
import { AlarmClock, BellRing, ChefHat, Circle, Clock, QrCode, Receipt, Users, Wallet } from 'lucide-react';
import type { DashboardStats } from '../../types';
import { revenueParts } from '../../revenueBreakdown';
import { formatCurrency, formatElapsed, formatMinutes } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ItemCounts, LiveSummary, LiveTable } from './liveTables';
import { KIND_META } from './tableUi';

// "Masa durumu" kartının parçaları: özet şeridi, durum etiketi, gecikme şeridi, kalem ilerlemesi, etiketler.
// Süreler dakikada bir değişir; değişen metinler ya tek satırda kesilir (truncate) ya da kendi satırındadır,
// böylece "59 dk" → "1 sa 0 dk" geçişi kartın yüksekliğini oynatmaz. Rakamlar tabular-nums.

export function StatusLabel({ table, className }: { table: LiveTable; className?: string }) {
    const meta = KIND_META[table.kind];
    const Icon = meta.icon;
    return (
        <span className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold',
            table.kind === 'busy' ? 'text-foreground' : table.kind === 'reserved' ? 'text-rb-accent' : 'text-rb-text-sub',
            className,
        )}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {meta.label}
        </span>
    );
}

/** Sabit üç satır: gecikme süresi, ürün, hazırlanma süresi. Her satır kendi içinde kesilir. */
export function OverdueStrip({ table }: { table: LiveTable }) {
    if (table.overdue.length === 0) return null;
    const first = table.overdue[0];
    const more = table.overdue.length - 1;
    return (
        <div className="flex items-start gap-1.5 rounded-md bg-rb-red px-2 py-1 text-xs text-rb-red-foreground">
            <AlarmClock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">
                <span className="block truncate font-bold tabular-nums">
                    {first.lateMinutes > 0 ? `Gecikme ${formatMinutes(first.lateMinutes)}` : 'Süre doldu'}
                    {more > 0 && ` · +${more} ürün`}
                </span>
                <span className="block truncate font-semibold">{first.quantity}× {first.productName}</span>
                <span className="block truncate">hazırlanma süresi {first.prepMinutes} dk</span>
            </span>
        </div>
    );
}

/**
 * Kalemlerin mutfak / hazır / servis dağılımı. Çubuk yalnızca göz yardımı (aria-hidden); aynı bilgi altındaki
 * metinde sayı ve sözcükle yazılı, renk tek işaret değil. Parçalar arasında boşluk var ki renkler birbirine karışmasın.
 */
export function ItemProgress({ counts }: { counts: ItemCounts }) {
    if (counts.total === 0) return <p className="text-xs text-rb-text-sub">Henüz ürün yok</p>;
    const pct = (n: number) => `${(n / counts.total) * 100}%`;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex h-1.5 gap-px overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
                {counts.served > 0 && <span className="bg-rb-green" style={{ width: pct(counts.served) }} />}
                {counts.ready > 0 && <span className="bg-rb-accent" style={{ width: pct(counts.ready) }} />}
                {counts.kitchen > 0 && <span className="bg-rb-orange" style={{ width: pct(counts.kitchen) }} />}
            </div>
            <p className="truncate text-xs tabular-nums text-rb-text-sub">
                <span className="font-semibold text-foreground">{counts.served}/{counts.total}</span> servis edildi
                {counts.ready > 0 && <span className="font-semibold text-rb-accent"> · {counts.ready} hazır</span>}
                {counts.kitchen > 0 && <> · {counts.kitchen} mutfakta</>}
            </p>
        </div>
    );
}

/**
 * Hazır ürün, hesap isteği, QR isteği, uzun açık: her etiket kendi satırında ve simgeli. Hesap süresi
 * uzayınca etiket yan satıra kaymaz, kart zıplamaz. Çerçeve, renkli zeminin koyu temada da seçilmesini sağlar.
 */
export function TableFlags({ table, now }: { table: LiveTable; now: number }) {
    const flags: { key: string; icon: typeof Circle; text: string; cls: string }[] = [];
    if (table.counts.ready > 0) {
        flags.push({ key: 'ready', icon: BellRing, text: `${table.counts.ready} hazır, servis bekliyor`, cls: 'bg-rb-accent-bg text-rb-accent' });
    }
    if (table.billRequestedAt) {
        flags.push({ key: 'bill', icon: Receipt, text: `Hesap istendi · ${formatElapsed(table.billRequestedAt, now)}`, cls: 'bg-rb-gold-bg text-rb-amber' });
    }
    if (table.qrRequest) flags.push({ key: 'qr', icon: QrCode, text: 'Yeni QR sipariş · onay bekliyor', cls: 'bg-rb-gold text-rb-gold-foreground' });
    if (table.longOpen && table.overdue.length === 0) {
        flags.push({ key: 'long', icon: Clock, text: 'Uzun açık', cls: 'bg-rb-orange-bg text-rb-orange' });
    }
    if (flags.length === 0) return null;
    return (
        <ul className="flex flex-col items-start gap-1">
            {flags.map(f => (
                <li
                    key={f.key}
                    className={cn('inline-flex max-w-full items-center gap-1 rounded-md border border-current/25 px-1.5 py-0.5 text-xs font-bold tabular-nums', f.cls)}
                >
                    <f.icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{f.text}</span>
                </li>
            ))}
        </ul>
    );
}

function Stat({ icon: Icon, label, value, sub, tone, wrapSub }: {
    icon: typeof Circle;
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    tone?: string;
    /** Alt satır kesilmeden alt alta akar (ciro dağılımı gibi kaybolmaması gereken bilgi). */
    wrapSub?: boolean;
}) {
    return (
        <div className={cn('flex min-w-0 items-center gap-2 rounded-xl bg-background px-3 py-2', tone)}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
                <p className="truncate text-base font-bold leading-tight tabular-nums">{value}</p>
                {sub && <div className={cn('text-xs tabular-nums opacity-80', !wrapSub && 'truncate')}>{sub}</div>}
            </div>
        </div>
    );
}

/**
 * Masaya özgü olmayan bilgiler (eski "Şu an" kartı + gecikme toplamı + ciro dağılımı).
 * Masalardan önce okunur. Sütun sayısı kartın kendi genişliğine göre (@container): dar kartta iki, orta
 * genişlikte üç (2 × 3), geniş kartta altı (tek satır); kutucuklar yazıyı kesecek kadar daralmaz.
 */
export function SummaryBar({ summary, stats, now }: { summary: LiveSummary; stats: DashboardStats; now: number }) {
    const s = summary;
    const parts = revenueParts(stats.revenue).filter(p => p.amount > 0);
    return (
        <div className="@container flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2 text-foreground @lg:grid-cols-3 @[66rem]:grid-cols-6">
                <Stat icon={Users} label="Dolu masa" value={<>{s.occupied}<span className="text-sm text-rb-text-sub">/{s.totalTables}</span></>} sub={`%${s.occupancyPct} doluluk`} />
                <Stat icon={Receipt} label="Açık sipariş" value={s.openOrders} sub={`Masalarda ${formatCurrency(s.openTotal)}`} />
                <Stat
                    icon={ChefHat}
                    label="Mutfakta"
                    value={s.kitchenPending}
                    sub={s.readyWaiting > 0 ? `${s.readyWaiting} ürün servis bekliyor` : 'Servis bekleyen yok'}
                    tone={s.kitchenPending > 0 ? 'bg-rb-orange-bg text-rb-orange' : undefined}
                />
                <Stat
                    icon={AlarmClock}
                    label="Geciken"
                    value={s.overdueItems}
                    sub={s.overdueItems > 0 ? `${s.overdueTables} masada` : 'Gecikme yok'}
                    tone={s.overdueItems > 0 ? 'bg-rb-red text-rb-red-foreground' : undefined}
                />
                <Stat
                    icon={BellRing}
                    label="Hesap / istek"
                    value={s.billRequests + s.qrRequests}
                    sub={`${s.billRequests} hesap · ${s.qrRequests} QR`}
                    tone={s.billRequests + s.qrRequests > 0 ? 'bg-rb-gold-bg text-rb-amber' : undefined}
                />
                <Stat
                    icon={Wallet}
                    label="Bugünün cirosu"
                    value={formatCurrency(stats.revenue.today)}
                    wrapSub
                    sub={parts.length > 0
                        ? (
                            <span className="flex flex-wrap gap-x-2">
                                {parts.map(p => <span key={p.key} className="whitespace-nowrap">{p.label.split(' ')[0]} {formatCurrency(p.amount)}</span>)}
                            </span>
                        )
                        : 'Henüz ödeme yok'}
                />
            </div>
            <p className="truncate text-xs tabular-nums text-rb-text-sub">
                {s.longestOpenTableName && s.longestOpenSince
                    ? `En uzun açık masa: ${s.longestOpenTableName} (${formatElapsed(s.longestOpenSince, now)}).`
                    : 'Şu an açık masa yok.'}
            </p>
            <p className="text-xs text-rb-text-sub">Gecikme yalnızca hazırlanma süresi girilmiş ürünler için izlenir.</p>
            {s.overdueUnplaced.length > 0 && (
                <p className="rounded-lg bg-rb-red-bg px-3 py-1.5 text-xs font-semibold text-rb-red">
                    Masaya bağlı olmayan geciken: {s.overdueUnplaced.map(o => `${o.quantity}× ${o.productName} (${formatMinutes(o.lateMinutes)})`).join(', ')}
                </p>
            )}
        </div>
    );
}
