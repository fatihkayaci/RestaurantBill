import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Bike, ChevronDown, Columns3, List, RefreshCw, Search, Volume2, VolumeX, Wallet,
} from 'lucide-react';
import { SwitchTrack } from '@/components/ui/switch';
import CourierCashPanel from '@/pages/cashier/components/CourierCashPanel';
import type { CourierCashSummary } from '@/features/courier/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatElapsed, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { deliveryService, type OnlineOrderingStatus } from '../api/deliveryService';
import {
    ETA_CHOICES, boardColumnOf, countdownText, deliveryLateness, mergeBoardOrders, orderTitle, type BoardColumnKey,
} from '../deliveryStatus';
import { onlineOrderSound } from '../onlineOrderSound';
import { markOnlineOrderSeen, subscribeOnlineOrders } from '../onlineOrdersHub';
import { DeliveryStatus, DoorPayment, type DeliveryOrder } from '../types';
import CourierPicker from './CourierPicker';
import DeliveryOrderDetail from './DeliveryOrderDetail';
import LatenessBadge from './LatenessBadge';

interface Props {
    /** Engelleme (telefon kara listesi) yalnızca Owner/Admin. */
    canBlockPhone: boolean;
    /** Kök kutunun iç boşluğu; yönetici sayfası kendi boşluğunu verdiği için "" geçer. */
    className?: string;
}

type View = 'board' | 'list' | 'couriers';

/** Panonun dört şeridi (teslim edilenler şeritlerin altında katlanır). */
type LaneKey = Exclude<BoardColumnKey, 'delivered'>;

const LANES: { key: LaneKey; label: string; empty: string }[] = [
    { key: 'new', label: 'Onay bekliyor', empty: 'Onay bekleyen sipariş yok.' },
    { key: 'preparing', label: 'Mutfakta', empty: 'Mutfakta sipariş yok.' },
    { key: 'ready', label: 'Hazır · kurye bekliyor', empty: 'Hazır paket yok.' },
    { key: 'onTheWay', label: 'Yolda', empty: 'Yolda paket yok.' },
];

/** "Teslim edildi" bölümünde kasaya alınmışlardan kaç tanesi açık durur; gerisi "Tümünü göster" ile. */
const SETTLED_VISIBLE = 6;

const canAssignCourier = (status: DeliveryOrder['status']) =>
    status === DeliveryStatus.Accepted || status === DeliveryStatus.Preparing || status === DeliveryStatus.Ready;

function timeOf(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
}

function payWord(order: DeliveryOrder): string {
    return order.paymentPreference === DoorPayment.Nakit ? 'nakit' : 'kart';
}

function itemCount(order: DeliveryOrder): number {
    return order.lines.reduce((sum, l) => sum + l.quantity, 0);
}

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toLocaleUpperCase('tr-TR')).join('');
}

/** Otomatik rete kalan sürenin ne kadarı geçti (0–1); çubuğun doluluğu. */
function autoRejectProgress(order: DeliveryOrder, now: number): number {
    if (!order.autoRejectAt) return 0;
    const start = new Date(order.createdAt).getTime();
    const end = new Date(order.autoRejectAt).getTime();
    if (end <= start) return 1;
    return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

const isUrgent = (order: DeliveryOrder, now: number) =>
    !!order.autoRejectAt && new Date(order.autoRejectAt).getTime() - now < 2 * 60_000;

function etaChoicesFor(order: DeliveryOrder): number[] {
    const suggested = order.suggestedEtaMinutes > 0 ? order.suggestedEtaMinutes : 30;
    return (ETA_CHOICES as readonly number[]).includes(suggested)
        ? [...ETA_CHOICES]
        : [...ETA_CHOICES, suggested].sort((a, b) => a - b).slice(-4);
}

// Online paket siparişler panosu: kasiyer ekranında sekme, yöneticide /admin/online-orders sayfası. Üstte canlı durum
// şeridi (satış açık/durduruldu, ses, sayaçlar). "Pano": Onay bekliyor / Mutfakta / Hazır / Yolda şeritleri; kabul,
// ret ve kurye ataması kartın üstünde. Teslim edilenler altta katlanır. "Liste": yoğun şube için tek liste, filtre ve
// arama. "Kurye kasası": kuryelerdeki tahsilatın "Teslim al"ı. Canlı olaylar uyarılarla aynı bağlantıdan.
export default function OnlineOrdersBoard({ canBlockPhone, className }: Props) {
    const [params, setParams] = useSearchParams();
    const [orders, setOrders] = useState<DeliveryOrder[] | null>(null);
    const [couriers, setCouriers] = useState<CourierCashSummary[]>([]);
    const [status, setStatus] = useState<OnlineOrderingStatus | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [view, setView] = useState<View>('board');
    const [mobileLane, setMobileLane] = useState<BoardColumnKey>('new');
    const [now, setNow] = useState(() => Date.now());
    const [pausing, setPausing] = useState(false);
    /** Kartın üzerinde kurye seçicisi açık olan sipariş (aynı anda bir tane). */
    const [pickerFor, setPickerFor] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);
    /** Kartta kabul/ret işlemi süren sipariş. */
    const [actingId, setActingId] = useState<string | null>(null);
    /** Kartta seçilen teslim süresi (seçilmediyse bölgenin önerisi). */
    const [etaFor, setEtaFor] = useState<Record<string, number>>({});
    /** Detay "Reddet" adımında açılsın (kartın Reddet düğmesi). */
    const [rejectFor, setRejectFor] = useState<string | null>(null);
    const [deliveredOpen, setDeliveredOpen] = useState(false);
    const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedId = params.get('siparis');

    const load = useCallback(() => {
        Promise.all([deliveryService.getOrders('active'), deliveryService.getOrders('today')])
            .then(([active, today]) => {
                setOrders(mergeBoardOrders(active, today));
                setLoadFailed(false);
            })
            .catch(() => setLoadFailed(true));
        deliveryService.getCouriers().then(setCouriers).catch(() => {});
    }, []);

    const loadStatus = useCallback(() => {
        deliveryService.getStatus().then(setStatus).catch(() => {});
    }, []);

    useEffect(() => {
        load();
        loadStatus();
        // Art arda gelen olaylar (kabul + mutfak) tek yenilemede toplanır.
        const unsubscribe = subscribeOnlineOrders(() => {
            if (reloadTimer.current) clearTimeout(reloadTimer.current);
            reloadTimer.current = setTimeout(load, 250);
        });
        const onFocus = () => { load(); loadStatus(); };
        window.addEventListener('focus', onFocus);
        return () => {
            unsubscribe();
            window.removeEventListener('focus', onFocus);
            if (reloadTimer.current) clearTimeout(reloadTimer.current);
        };
    }, [load, loadStatus]);

    const hasNew = (orders ?? []).some(o => o.status === DeliveryStatus.Received);
    useEffect(() => {
        // Yeni sipariş varken geri sayım saniyede bir, yoksa yaş ve gecikme bilgisi yarım dakikada bir yenilenir.
        const timer = setInterval(() => setNow(Date.now()), hasNew ? 1000 : 30_000);
        return () => clearInterval(timer);
    }, [hasNew]);

    // Açılan yeni siparişin uyarısı ve sesi bu cihazda susar.
    useEffect(() => {
        if (selectedId) markOnlineOrderSeen(selectedId);
    }, [selectedId]);

    const columns = useMemo(() => {
        const grouped: Record<BoardColumnKey, DeliveryOrder[]> = { new: [], preparing: [], ready: [], onTheWay: [], delivered: [] };
        for (const order of orders ?? []) {
            const key = boardColumnOf(order.status);
            if (key) grouped[key].push(order);
        }
        // Onay bekleyenler otomatik rete en yakın üstte; teslim edilenler en yeni üstte; diğerleri en eski üstte.
        grouped.new.sort((a, b) => (a.autoRejectAt ?? a.createdAt).localeCompare(b.autoRejectAt ?? b.createdAt));
        grouped.delivered.reverse();
        return grouped;
    }, [orders]);

    const stats = useMemo(() => {
        const delivered = columns.delivered;
        const durations = delivered
            .filter(o => o.deliveredAt)
            .map(o => (new Date(o.deliveredAt!).getTime() - new Date(o.createdAt).getTime()) / 60_000);
        const late = [...columns.preparing, ...columns.ready, ...columns.onTheWay]
            .filter(o => deliveryLateness(o, now)?.level === 'late').length;
        return {
            pending: columns.new.length,
            late,
            avgMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
            todayCount: delivered.length,
            todayTotal: delivered.reduce((sum, o) => sum + (o.collectedAmount ?? o.total), 0),
        };
    }, [columns, now]);

    const selected = selectedId ? (orders ?? []).find(o => o.id === selectedId) ?? null : null;

    const openOrder = (id: string, reject = false) => {
        setRejectFor(reject ? id : null);
        setParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('siparis', id);
            return next;
        });
    };
    const closeOrder = () => {
        setRejectFor(null);
        setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('siparis');
            return next;
        }, { replace: true });
    };

    // Anahtar "Siparişe açık" gösterir (açık = sipariş alınıyor); sunucudaki alan "paused" (tersi) olarak kalır.
    const setOpen = async (open: boolean) => {
        setPausing(true);
        try {
            const result = await deliveryService.setPaused(!open);
            setStatus(result);
            toast.success(result.paused ? 'Online sipariş durduruldu. Müşteriler şu an sipariş veremez.' : 'Online sipariş yeniden açıldı.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Online sipariş durumu değiştirilemedi.'));
        } finally {
            setPausing(false);
            // Durdurma olay göndermez; başka bir ekranın değiştirmiş olabileceğine karşı yeniden okunur.
            loadStatus();
        }
    };

    const assignFromCard = async (order: DeliveryOrder, courierUserId: string | null) => {
        setAssigning(true);
        try {
            await deliveryService.assignCourier(order.id, courierUserId);
            const name = couriers.find(c => c.userId === courierUserId)?.fullName;
            toast.success(courierUserId
                ? `${orderTitle(order)} · kurye ${name ?? ''} atandı.`
                : `${orderTitle(order)} · kurye ataması kaldırıldı.`);
            setPickerFor(null);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Kurye atanamadı.'));
        } finally {
            setAssigning(false);
            load();
        }
    };

    const etaOf = (order: DeliveryOrder) => etaFor[order.id] ?? (order.suggestedEtaMinutes > 0 ? order.suggestedEtaMinutes : 30);

    const acceptFromCard = async (order: DeliveryOrder) => {
        const eta = etaOf(order);
        setActingId(order.id);
        markOnlineOrderSeen(order.id);
        try {
            await deliveryService.accept(order.id, eta);
            toast.success(`${orderTitle(order)} kabul edildi · ${eta} dk. Mutfağa gönderildi.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Sipariş kabul edilemedi.'));
        } finally {
            setActingId(null);
            load();
        }
    };

    const togglePicker = (id: string) => setPickerFor(prev => (prev === id ? null : id));

    const cardProps = (order: DeliveryOrder) => ({
        order,
        now,
        couriers,
        onOpen: () => openOrder(order.id),
        pickerOpen: pickerFor === order.id,
        onTogglePicker: () => togglePicker(order.id),
        assigning,
        onAssign: (courierUserId: string | null) => assignFromCard(order, courierUserId),
    });

    const renderNewCard = (order: DeliveryOrder) => (
        <NewOrderCard
            key={order.id}
            order={order}
            now={now}
            eta={etaOf(order)}
            onEta={m => setEtaFor(prev => ({ ...prev, [order.id]: m }))}
            busy={actingId === order.id}
            onOpen={() => openOrder(order.id)}
            onAccept={() => acceptFromCard(order)}
            onReject={() => openOrder(order.id, true)}
        />
    );

    // Teslim edilenler: kuryede duran (kasaya teslim edilmemiş) tahsilat ayrı ve açık; kasaya alınanlar tek satır.
    const unsettled = columns.delivered.filter(o => !o.settledAt);
    const settled = columns.delivered.filter(o => o.settledAt);
    const unsettledTotal = unsettled.reduce((sum, o) => sum + (o.collectedAmount ?? o.total), 0);

    const deliveredSummary = (
        <button
            type="button"
            onClick={() => { setDeliveredOpen(v => !v); setMobileLane('delivered'); }}
            aria-expanded={deliveredOpen}
            className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-dashed border-border px-3 py-2.5 text-left text-sm text-muted-foreground hover:border-rb-gold"
        >
            <span>Bugün teslim: <b className="tabular-nums text-foreground">{columns.delivered.length}</b></span>
            {unsettled.length > 0
                ? <span className="font-semibold text-rb-amber">{unsettled.length} kasaya teslim edilmedi →</span>
                : <ChevronDown className={cn('h-4 w-4 transition-transform', deliveredOpen && 'rotate-180')} aria-hidden="true" />}
        </button>
    );

    return (
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4', className ?? 'p-4 sm:p-6')}>
            {/* Görünüm seçici */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Görünüm">
                    {([
                        ['board', 'Pano', Columns3],
                        ['list', 'Liste', List],
                        ['couriers', 'Kurye kasası', Wallet],
                    ] as const).map(([key, label, Icon]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={view === key}
                            onClick={() => setView(key)}
                            className={cn(
                                'flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition-colors',
                                view === key ? 'bg-rb-gold text-rb-gold-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" />{label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => { load(); loadStatus(); }}
                    aria-label="Yenile"
                    title="Yenile"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <StatusStrip status={status} pausing={pausing} onSetOpen={setOpen} stats={stats} />

            {view === 'couriers' ? (
                <CourierCashPanel />
            ) : orders === null ? (
                loadFailed ? (
                    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rb-red/30 bg-rb-red-bg px-4 py-3">
                        <p className="text-sm text-foreground">Online siparişler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
                        <button type="button" onClick={load} className="h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold">Tekrar dene</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr_1fr_1fr]" aria-busy="true">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-[20px] bg-muted" />)}
                    </div>
                )
            ) : view === 'list' ? (
                <ListView
                    orders={orders}
                    now={now}
                    couriers={couriers}
                    pickerFor={pickerFor}
                    onTogglePicker={togglePicker}
                    assigning={assigning}
                    onAssign={assignFromCard}
                    actingId={actingId}
                    etaOf={etaOf}
                    onAccept={acceptFromCard}
                    onOpen={openOrder}
                />
            ) : (
                <>
                    {/* Dar ekran: şerit seçici */}
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden" role="tablist" aria-label="Şeritler">
                        {[...LANES, { key: 'delivered' as const, label: 'Teslim' }].map(lane => {
                            const count = columns[lane.key].length;
                            const active = mobileLane === lane.key;
                            return (
                                <button
                                    key={lane.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setMobileLane(lane.key)}
                                    className={cn(
                                        'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold',
                                        active ? 'border-foreground bg-foreground text-background'
                                            : lane.key === 'new' && count > 0 ? 'border-rb-accent/50 bg-rb-accent-bg text-rb-accent'
                                                : 'border-border bg-card text-foreground'
                                    )}
                                >
                                    {lane.label}
                                    <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-white/20' : 'bg-black/10')}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
                        {LANES.map(lane => {
                            const list = columns[lane.key];
                            const isNewLane = lane.key === 'new';
                            return (
                                <section
                                    key={lane.key}
                                    aria-label={lane.label}
                                    className={cn(
                                        'flex min-h-0 flex-col gap-3 rounded-[20px] lg:overflow-y-auto lg:p-3',
                                        isNewLane && 'lg:bg-rb-accent/[.06]',
                                        mobileLane !== lane.key && 'hidden lg:flex'
                                    )}
                                >
                                    <h2 className="hidden items-center justify-between px-1 text-sm font-bold text-foreground lg:flex">
                                        {lane.label}
                                        <span className={cn(
                                            'rounded-full px-2 text-xs font-bold tabular-nums',
                                            isNewLane && list.length > 0 ? 'bg-rb-accent text-rb-accent-foreground' : 'text-muted-foreground'
                                        )}>{list.length}</span>
                                    </h2>
                                    {list.length === 0 ? (
                                        <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">{lane.empty}</p>
                                    ) : isNewLane ? list.map(renderNewCard) : list.map(order => <LaneCard key={order.id} {...cardProps(order)} />)}
                                    {lane.key === 'onTheWay' && <div className="mt-auto hidden lg:block">{deliveredSummary}</div>}
                                </section>
                            );
                        })}

                        {/* Dar ekranda "Teslim" şeridi: teslim edilenler doğrudan açık. */}
                        <div className={cn('flex flex-col gap-3 lg:hidden', mobileLane !== 'delivered' && 'hidden')}>
                            <DeliveredSection unsettled={unsettled} unsettledTotal={unsettledTotal} settled={settled} now={now} onOpen={openOrder} />
                        </div>
                    </div>

                    {deliveredOpen && (
                        <section aria-label="Bugün teslim edilenler" className="hidden flex-col gap-3 rounded-[20px] border border-border bg-card p-4 lg:flex">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-bold text-foreground">Bugün teslim edilenler · {columns.delivered.length}</h2>
                                <button type="button" onClick={() => setDeliveredOpen(false)} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:text-foreground">Kapat</button>
                            </div>
                            <DeliveredSection unsettled={unsettled} unsettledTotal={unsettledTotal} settled={settled} now={now} onOpen={openOrder} wide />
                        </section>
                    )}
                </>
            )}

            {selected && (
                <DeliveryOrderDetail
                    key={selected.id}
                    order={selected}
                    couriers={couriers}
                    canBlockPhone={canBlockPhone}
                    now={now}
                    onClose={closeOrder}
                    onChanged={load}
                    initialStep={rejectFor === selected.id && selected.status === DeliveryStatus.Received ? 'reject' : 'main'}
                />
            )}
        </div>
    );
}

// ── Canlı durum şeridi ────────────────────────────────────────────────────────────────────────

interface StripProps {
    status: OnlineOrderingStatus | null;
    pausing: boolean;
    onSetOpen: (open: boolean) => void;
    stats: { pending: number; late: number; avgMinutes: number | null; todayCount: number; todayTotal: number };
}

function StatusStrip({ status, pausing, onSetOpen, stats }: StripProps) {
    const sound = useSyncExternalStore(onlineOrderSound.subscribe, onlineOrderSound.getState);
    const open = !!status?.enabled && !status.paused;

    const stat = (label: string, value: string, className = 'text-foreground') => (
        <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className={cn('text-xl font-bold tabular-nums', className)}>{value}</p>
        </div>
    );

    return (
        <div className={cn(
            'flex flex-col gap-3 rounded-2xl border bg-card px-4 py-3 lg:flex-row lg:items-center',
            status?.paused ? 'border-rb-red/40' : 'border-border'
        )}>
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-h-9 items-center gap-2 pr-1">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            !status ? 'bg-muted-foreground/40' : open ? 'bg-rb-green motion-safe:animate-pulse' : status.enabled ? 'bg-rb-red' : 'bg-muted-foreground/50'
                        )}
                    />
                    <span className="text-sm font-semibold text-foreground">
                        {!status ? 'Durum okunuyor…' : open ? 'Sipariş alınıyor' : status.enabled ? 'Durduruldu · müşteri sipariş veremez' : 'Online sipariş ayarlarda kapalı'}
                    </span>
                </div>

                {status?.enabled && (
                    <button
                        type="button"
                        role="switch"
                        aria-checked={open}
                        disabled={pausing}
                        onClick={() => onSetOpen(!open)}
                        className={cn(
                            'flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold disabled:opacity-50',
                            open ? 'border-border text-foreground' : 'border-rb-red/40 bg-rb-red-bg text-rb-red'
                        )}
                    >
                        <SwitchTrack checked={open} />
                        {open ? 'Siparişe açık' : 'Siparişe kapalı'}
                    </button>
                )}

                <button
                    type="button"
                    data-online-order-sound-toggle
                    onClick={onlineOrderSound.toggle}
                    aria-pressed={sound === 'on'}
                    title={sound === 'locked' ? 'Tarayıcı sesi bekletiyor; açmak için dokunun' : sound === 'on' ? 'Sesi kapat' : 'Sesi aç'}
                    className={cn(
                        'flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold',
                        sound === 'on' ? 'bg-rb-green-bg text-rb-green'
                            : sound === 'locked' ? 'bg-rb-amber-bg text-rb-amber ring-1 ring-rb-amber/40'
                                : 'bg-muted text-muted-foreground'
                    )}
                >
                    {sound === 'on' ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
                    {sound === 'on' ? 'Ses açık' : sound === 'locked' ? 'Ses kilitli · aç' : 'Ses kapalı'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 lg:ml-auto lg:flex lg:items-center">
                {stat('Onay bekleyen', String(stats.pending), stats.pending > 0 ? 'text-rb-accent' : 'text-foreground')}
                {stat('Geciken', String(stats.late), stats.late > 0 ? 'text-rb-red' : 'text-foreground')}
                {stat('Ort. teslim', stats.avgMinutes !== null ? `${stats.avgMinutes} dk` : '—')}
                {stat('Bugün', `${stats.todayCount} · ₺${formatPrice(stats.todayTotal)}`)}
            </div>
        </div>
    );
}

// ── Kartlar ───────────────────────────────────────────────────────────────────────────────────

interface NewOrderCardProps {
    order: DeliveryOrder;
    now: number;
    eta: number;
    onEta: (minutes: number) => void;
    busy: boolean;
    onOpen: () => void;
    onAccept: () => void;
    onReject: () => void;
}

// Onay bekleyen sipariş: geri sayım ve çubuk, teslim süresi seçimi, Reddet (gerekçe detayda) ve Kabul et.
function NewOrderCard({ order, now, eta, onEta, busy, onOpen, onAccept, onReject }: NewOrderCardProps) {
    const urgent = isUrgent(order, now);
    const progress = autoRejectProgress(order, now);

    return (
        <div className={cn('rounded-2xl border bg-card p-3.5 shadow-sm', urgent ? 'border-rb-red/40' : 'border-border')}>
            <button type="button" onClick={onOpen} className="flex w-full items-start justify-between gap-2 text-left">
                <span className="min-w-0">
                    <span className="block truncate font-serif text-xl font-bold text-foreground">{orderTitle(order)}</span>
                    <span className="block text-xs text-muted-foreground">
                        {itemCount(order)} ürün · ₺{formatPrice(order.total)} · {payWord(order)} · {formatElapsed(order.createdAt, now)} önce
                    </span>
                </span>
                {order.autoRejectAt && (
                    <span className="flex shrink-0 flex-col items-end">
                        <span className={cn('text-[11px] font-semibold', urgent ? 'text-rb-red' : 'text-muted-foreground')}>otomatik ret</span>
                        <span className={cn('text-lg font-bold tabular-nums', urgent ? 'text-rb-red' : 'text-rb-amber')}>{countdownText(order.autoRejectAt, now)}</span>
                    </span>
                )}
            </button>
            {order.autoRejectAt && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className={cn('block h-full transition-[width]', urgent ? 'bg-rb-red' : 'bg-rb-amber')} style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
            )}

            <div className="mt-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Teslim süresi">
                {etaChoicesFor(order).map(m => (
                    <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={eta === m}
                        onClick={() => onEta(m)}
                        className={cn(
                            'flex h-10 items-center justify-center rounded-lg border text-sm font-bold tabular-nums',
                            eta === m ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border text-foreground hover:border-rb-gold'
                        )}
                    >
                        {m}
                    </button>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
                <button type="button" onClick={onReject} disabled={busy}
                    className="flex h-12 flex-1 items-center justify-center rounded-xl border border-rb-red/40 text-sm font-semibold text-rb-red hover:bg-rb-red-bg disabled:opacity-50">
                    Reddet
                </button>
                <button type="button" onClick={onAccept} disabled={busy}
                    className="flex h-12 flex-[2] items-center justify-center rounded-xl bg-rb-green text-sm font-semibold text-rb-green-foreground hover:opacity-90 disabled:opacity-50">
                    {busy ? 'Kabul ediliyor…' : `Kabul et · ${eta} dk`}
                </button>
            </div>
        </div>
    );
}

interface LaneCardProps {
    order: DeliveryOrder;
    now: number;
    couriers: CourierCashSummary[];
    onOpen: () => void;
    pickerOpen: boolean;
    onTogglePicker: () => void;
    assigning: boolean;
    onAssign: (courierUserId: string | null) => void;
}

// Mutfakta / Hazır / Yolda kartı: söz verilen saate göre hap, özet, kurye (Hazır'da kurye yoksa seçici açık gelir).
function LaneCard({ order, now, couriers, onOpen, pickerOpen, onTogglePicker, assigning, onAssign }: LaneCardProps) {
    const lateness = deliveryLateness(order, now);
    const isReady = order.status === DeliveryStatus.Ready;
    const onTheWay = order.status === DeliveryStatus.OnTheWay;
    const canAssign = canAssignCourier(order.status);
    const needsCourier = isReady && !order.courierUserId;
    const showPicker = canAssign && (pickerOpen || needsCourier);
    const firstLine = order.lines[0];

    return (
        <div className={cn(
            'rounded-2xl border bg-card p-3.5 transition-shadow hover:shadow-md',
            lateness?.level === 'late' ? 'border-rb-red/40' : needsCourier ? 'border-rb-amber/50' : 'border-border'
        )}>
            <button type="button" onClick={onOpen} className="flex w-full flex-col gap-1 text-left">
                <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate font-serif text-lg font-bold text-foreground">{orderTitle(order)}</span>
                    <LatenessBadge order={order} now={now} className="shrink-0" />
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    ₺{formatPrice(order.total)} · {payWord(order)}
                    {onTheWay
                        ? `${order.courierName ? ` · ${order.courierName}` : ''}${order.dispatchedAt ? ` · ${formatElapsed(order.dispatchedAt, now)} önce çıktı` : ''}`
                        : firstLine ? ` · ${firstLine.quantity}× ${firstLine.name}${order.lines.length > 1 ? '…' : ''}` : ''}
                </span>
            </button>

            {canAssign && (
                <div className="mt-2">
                    {needsCourier ? (
                        <p className="mb-1.5 mt-1 text-[11px] font-semibold uppercase tracking-widest text-rb-amber">Kurye ata</p>
                    ) : (
                        <button
                            type="button"
                            onClick={onTogglePicker}
                            aria-expanded={pickerOpen}
                            className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg text-xs font-semibold"
                        >
                            {order.courierName ? (
                                <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rb-gold/30 text-[10px] font-bold" aria-hidden="true">
                                        {initials(order.courierName)}
                                    </span>
                                    <span className="truncate">{order.courierName}</span>
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Kurye: <span className="text-rb-accent underline">ata</span></span>
                            )}
                            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                                {order.courierName ? 'Değiştir' : ''}
                                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', pickerOpen && 'rotate-180')} aria-hidden="true" />
                            </span>
                        </button>
                    )}
                    {showPicker && (
                        <div className={cn(!needsCourier && 'pt-1.5')}>
                            <CourierPicker couriers={couriers} selectedId={order.courierUserId} disabled={assigning} onPick={onAssign} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Teslim edilenler ──────────────────────────────────────────────────────────────────────────

interface DeliveredProps {
    unsettled: DeliveryOrder[];
    unsettledTotal: number;
    settled: DeliveryOrder[];
    now: number;
    onOpen: (id: string) => void;
    wide?: boolean;
}

function DeliveredSection({ unsettled, unsettledTotal, settled, now, onOpen, wide }: DeliveredProps) {
    const [showAll, setShowAll] = useState(false);
    if (unsettled.length === 0 && settled.length === 0) {
        return <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">Bugün teslim edilen yok.</p>;
    }
    const grid = wide ? 'grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2';
    return (
        <>
            {unsettled.length > 0 && (
                <div className="flex flex-col gap-2 rounded-2xl border border-rb-amber/40 bg-rb-amber-bg p-2.5">
                    <p className="flex items-center justify-between gap-2 px-1 text-xs font-bold text-rb-amber">
                        <span className="flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />Kasaya teslim edilmedi · {unsettled.length}
                        </span>
                        <span className="tabular-nums">₺{formatPrice(unsettledTotal)}</span>
                    </p>
                    <div className={grid}>
                        {unsettled.map(order => <DeliveredRow key={order.id} order={order} now={now} onOpen={() => onOpen(order.id)} />)}
                    </div>
                </div>
            )}
            {settled.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    <p className="px-1 text-xs font-semibold text-muted-foreground">Kasaya alındı · {settled.length}</p>
                    <div className={grid}>
                        {(showAll ? settled : settled.slice(0, SETTLED_VISIBLE)).map(order => (
                            <DeliveredRow key={order.id} order={order} now={now} onOpen={() => onOpen(order.id)} />
                        ))}
                    </div>
                    {settled.length > SETTLED_VISIBLE && (
                        <button
                            type="button"
                            onClick={() => setShowAll(v => !v)}
                            aria-expanded={showAll}
                            className="min-h-10 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                            {showAll ? 'Daha az göster' : `Tümünü göster (${settled.length})`}
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

// Teslim edilmiş sipariş: tek satır; dokununca detay açılır.
function DeliveredRow({ order, now, onOpen }: { order: DeliveryOrder; now: number; onOpen: () => void }) {
    const amount = order.collectedAmount ?? order.total;
    const method = (order.collectedMethod ?? order.paymentPreference) === DoorPayment.Nakit ? 'nakit' : 'kart';
    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex min-h-12 w-full flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2 text-left transition-shadow hover:shadow-md"
        >
            <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold text-foreground">{orderTitle(order)}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">₺{formatPrice(amount)} <span className="text-[10px] font-bold uppercase text-muted-foreground">{method}</span></span>
            </span>
            <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="min-w-0 truncate">{timeOf(order.deliveredAt)}{order.courierName ? ` · ${order.courierName}` : ''}</span>
                <LatenessBadge order={order} now={now} className="py-0" />
            </span>
        </button>
    );
}

// ── Liste görünümü ────────────────────────────────────────────────────────────────────────────

type ListFilter = 'open' | BoardColumnKey;

const LIST_FILTERS: { key: ListFilter; label: string }[] = [
    { key: 'open', label: 'Açık' },
    { key: 'new', label: 'Onay bekliyor' },
    { key: 'preparing', label: 'Mutfakta' },
    { key: 'ready', label: 'Hazır' },
    { key: 'onTheWay', label: 'Yolda' },
    { key: 'delivered', label: 'Teslim' },
];

const STATUS_PILL: Record<BoardColumnKey, { label: string; className: string }> = {
    new: { label: 'Onay bekliyor', className: 'bg-rb-accent text-rb-accent-foreground' },
    preparing: { label: 'Mutfakta', className: 'bg-rb-amber-bg text-rb-amber' },
    ready: { label: 'Hazır', className: 'bg-rb-green-bg text-rb-green' },
    onTheWay: { label: 'Yolda', className: 'bg-rb-accent-bg text-rb-accent' },
    delivered: { label: 'Teslim edildi', className: 'bg-muted text-muted-foreground' },
};

/** Liste sırası: önce onay bekleyenler (rete yakın üstte), sonra gecikenler, sonra söz verilen saate göre. */
function urgencyRank(order: DeliveryOrder, now: number): number {
    if (order.status === DeliveryStatus.Received) return 0;
    if (order.status === DeliveryStatus.Delivered) return 3;
    return deliveryLateness(order, now)?.level === 'late' ? 1 : 2;
}

function digits(value: string): string {
    return value.replace(/\D/g, '');
}

interface ListViewProps {
    orders: DeliveryOrder[];
    now: number;
    couriers: CourierCashSummary[];
    pickerFor: string | null;
    onTogglePicker: (id: string) => void;
    assigning: boolean;
    onAssign: (order: DeliveryOrder, courierUserId: string | null) => void;
    actingId: string | null;
    etaOf: (order: DeliveryOrder) => number;
    onAccept: (order: DeliveryOrder) => void;
    onOpen: (id: string, reject?: boolean) => void;
}

// Yoğun şube için tek liste: durum filtresi, numara/isim/telefon araması; satırda kabul, ret ve kurye seçimi.
function ListView({ orders, now, couriers, pickerFor, onTogglePicker, assigning, onAssign, actingId, etaOf, onAccept, onOpen }: ListViewProps) {
    const [filter, setFilter] = useState<ListFilter>('open');
    const [query, setQuery] = useState('');

    const counts = useMemo(() => {
        const c: Record<ListFilter, number> = { open: 0, new: 0, preparing: 0, ready: 0, onTheWay: 0, delivered: 0 };
        for (const o of orders) {
            const key = boardColumnOf(o.status);
            if (!key) continue;
            c[key]++;
            if (key !== 'delivered') c.open++;
        }
        return c;
    }, [orders]);

    const rows = useMemo(() => {
        const q = query.trim().toLocaleLowerCase('tr-TR');
        const qDigits = digits(q);
        return orders
            .filter(o => {
                const key = boardColumnOf(o.status);
                if (!key) return false;
                if (filter === 'open' ? key === 'delivered' : key !== filter) return false;
                if (!q) return true;
                return String(o.number).includes(q.replace('#', ''))
                    || o.customerName.toLocaleLowerCase('tr-TR').includes(q)
                    || o.zoneName.toLocaleLowerCase('tr-TR').includes(q)
                    || (qDigits.length >= 3 && digits(o.customerPhone).includes(qDigits));
            })
            .sort((a, b) => {
                const rank = urgencyRank(a, now) - urgencyRank(b, now);
                if (rank !== 0) return rank;
                if (a.status === DeliveryStatus.Received) return (a.autoRejectAt ?? '').localeCompare(b.autoRejectAt ?? '');
                if (a.status === DeliveryStatus.Delivered) return (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? '');
                const pa = deliveryLateness(a, now)?.promisedAt.getTime() ?? Infinity;
                const pb = deliveryLateness(b, now)?.promisedAt.getTime() ?? Infinity;
                return pa - pb;
            });
    }, [orders, filter, query, now]);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:pb-0" role="tablist" aria-label="Durum filtresi">
                    {LIST_FILTERS.map(f => {
                        const active = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setFilter(f.key)}
                                className={cn(
                                    'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold',
                                    active ? 'border-foreground bg-foreground text-background'
                                        : f.key === 'new' && counts.new > 0 ? 'border-rb-accent/50 bg-rb-accent-bg text-rb-accent'
                                            : 'border-border bg-card text-foreground'
                                )}
                            >
                                {f.label}
                                <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-white/20' : 'bg-black/10')}>{counts[f.key]}</span>
                            </button>
                        );
                    })}
                </div>
                <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-rb-accent lg:ml-auto lg:w-64">
                    <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="No, isim, telefon"
                        aria-label="Sipariş ara"
                        className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                    />
                </label>
            </div>

            {rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                    {query ? 'Aramaya uyan sipariş yok.' : 'Bu durumda sipariş yok.'}
                </p>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="hidden grid-cols-[minmax(0,1.6fr)_120px_90px_130px_110px_minmax(0,1fr)_minmax(0,1.2fr)] gap-3 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground lg:grid">
                        <span>Sipariş</span><span>Durum</span><span>Süre</span><span>Söz</span><span className="text-right">Tutar</span><span>Kurye</span><span />
                    </div>
                    <ul className="divide-y divide-border">
                        {rows.map(order => (
                            <ListRow
                                key={order.id}
                                order={order}
                                now={now}
                                couriers={couriers}
                                pickerOpen={pickerFor === order.id}
                                onTogglePicker={() => onTogglePicker(order.id)}
                                assigning={assigning}
                                onAssign={id => onAssign(order, id)}
                                busy={actingId === order.id}
                                eta={etaOf(order)}
                                onAccept={() => onAccept(order)}
                                onReject={() => onOpen(order.id, true)}
                                onOpen={() => onOpen(order.id)}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

interface ListRowProps {
    order: DeliveryOrder;
    now: number;
    couriers: CourierCashSummary[];
    pickerOpen: boolean;
    onTogglePicker: () => void;
    assigning: boolean;
    onAssign: (courierUserId: string | null) => void;
    busy: boolean;
    eta: number;
    onAccept: () => void;
    onReject: () => void;
    onOpen: () => void;
}

function ListRow({ order, now, couriers, pickerOpen, onTogglePicker, assigning, onAssign, busy, eta, onAccept, onReject, onOpen }: ListRowProps) {
    const key = boardColumnOf(order.status) ?? 'delivered';
    const pill = STATUS_PILL[key];
    const isNew = order.status === DeliveryStatus.Received;
    const urgent = isNew && isUrgent(order, now);
    const canAssign = canAssignCourier(order.status);
    const cash = order.paymentPreference === DoorPayment.Nakit;

    return (
        <li className={cn(isNew && 'bg-rb-accent/[.05]')}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 lg:grid lg:grid-cols-[minmax(0,1.6fr)_120px_90px_130px_110px_minmax(0,1fr)_minmax(0,1.2fr)]">
                <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left lg:flex-none">
                    <span className="block truncate font-serif text-lg font-bold text-foreground">{orderTitle(order)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{order.customerName} · {itemCount(order)} ürün</span>
                </button>
                <span><span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', pill.className)}>{pill.label}</span></span>
                <span className={cn('text-sm tabular-nums', isNew ? cn('font-bold', urgent ? 'text-rb-red' : 'text-rb-amber') : 'text-muted-foreground')}>
                    {isNew && order.autoRejectAt ? `ret ${countdownText(order.autoRejectAt, now)}` : formatElapsed(order.createdAt, now)}
                </span>
                <span className="min-w-0">{isNew ? <span className="text-sm text-muted-foreground">—</span> : <LatenessBadge order={order} now={now} />}</span>
                <span className="ml-auto text-right font-serif text-lg font-bold tabular-nums text-foreground lg:ml-0">
                    ₺{formatPrice(order.total)}{' '}
                    <span className={cn('font-sans text-[10px] font-bold', cash ? 'text-rb-green' : 'text-rb-accent')}>{cash ? 'NAKİT' : 'KART'}</span>
                </span>
                <span className="min-w-0">
                    {canAssign ? (
                        <button
                            type="button"
                            onClick={onTogglePicker}
                            aria-expanded={pickerOpen}
                            className={cn(
                                'flex h-10 w-full max-w-44 items-center justify-between gap-1 rounded-lg border px-2.5 text-xs font-semibold',
                                order.courierName ? 'border-border text-foreground'
                                    : order.status === DeliveryStatus.Ready ? 'border-rb-amber/60 text-rb-amber' : 'border-border text-muted-foreground'
                            )}
                        >
                            <span className="flex min-w-0 items-center gap-1.5 truncate">
                                <Bike className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{order.courierName ?? 'Kurye seç'}
                            </span>
                            <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', pickerOpen && 'rotate-180')} aria-hidden="true" />
                        </button>
                    ) : (
                        <span className="text-sm font-semibold text-foreground">{order.courierName ?? <span className="text-muted-foreground">—</span>}</span>
                    )}
                </span>
                <span className="flex w-full justify-end gap-2 lg:w-auto">
                    {isNew && (
                        <>
                            <button type="button" onClick={onReject} disabled={busy}
                                className="flex h-10 items-center rounded-lg border border-rb-red/40 px-3 text-xs font-semibold text-rb-red hover:bg-rb-red-bg disabled:opacity-50">
                                Reddet
                            </button>
                            <button type="button" onClick={onAccept} disabled={busy}
                                className="flex h-10 items-center rounded-lg bg-rb-green px-3 text-xs font-semibold text-rb-green-foreground hover:opacity-90 disabled:opacity-50">
                                {busy ? 'Kabul ediliyor…' : `Kabul · ${eta} dk`}
                            </button>
                        </>
                    )}
                </span>
            </div>
            {canAssign && pickerOpen && (
                <div className="border-t border-border bg-muted/30 px-4 py-3 lg:pl-[calc(50%)]">
                    <CourierPicker couriers={couriers} selectedId={order.courierUserId} disabled={assigning} onPick={onAssign} />
                </div>
            )}
        </li>
    );
}
