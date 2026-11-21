import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
    AlertTriangle, Banknote, Bike, Check, ChevronDown, Clock, Columns3, CreditCard, Landmark, List, MapPin, Phone, RefreshCw, Search,
    Settings, StickyNote, Volume2, VolumeX, Wallet, X,
} from 'lucide-react';
import { Modal, ModalTitle } from '@/components/ui/modal';
import CourierCashPanel from '@/pages/cashier/components/CourierCashPanel';
import { telUrl, type CourierCashSummary } from '@/features/courier/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatElapsed, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { deliveryService, type OnlineOrderingStatus } from '../api/deliveryService';
import {
    ETA_CHOICES, PICKUP_ETA_CHOICES, boardColumnOf, countdownText, courierLoadText, deliveryLateness, mergeBoardOrders, orderTitle, type BoardColumnKey,
} from '../deliveryStatus';
import { onlineOrderSound } from '../onlineOrderSound';
import { markOnlineOrderSeen, subscribeOnlineOrders } from '../onlineOrdersHub';
import { DeliveryStatus, DoorPayment, doorPaymentWord, type DeliveryOrder } from '../types';
import CourierPicker from './CourierPicker';
import DeliveryOrderDetail from './DeliveryOrderDetail';
import PickupBadge from './PickupBadge';
import LatenessBadge from './LatenessBadge';

interface Props {
    /** Engelleme (telefon kara listesi) yalnızca Owner/Admin. */
    canBlockPhone: boolean;
    /** Kök kutunun iç boşluğu; yönetici sayfası kendi boşluğunu verdiği için "" geçer. */
    className?: string;
    /** Yönetici sayfası: üst satırdaki büyük başlık (kasiyer sekmesinde yok). */
    title?: string;
    /** Yönetici sayfası: "Ayarlar" bağlantısı (online sipariş ayarları). */
    settingsHref?: string;
}

type View = 'board' | 'list';

/** Akışın üç şeridi; onay bekleyenler soldaki gelen kutusunda, teslim edilenler altta katlanır. */
type FlowLaneKey = 'preparing' | 'ready' | 'onTheWay';

const FLOW_LANES: { key: FlowLaneKey; label: string; hint?: string; empty: string }[] = [
    { key: 'preparing', label: 'Mutfakta', hint: 'en acil üstte', empty: 'Mutfakta sipariş yok.' },
    { key: 'ready', label: 'Hazır · kurye bekliyor', empty: 'Hazır paket yok.' },
    { key: 'onTheWay', label: 'Yolda', empty: 'Yolda paket yok.' },
];

/**
 * Durum renkleri (şerit noktası, liste rozeti): Onay bekliyor mavi (dolu rozet), Mutfakta turuncu, Hazır mor,
 * Yolda gri-kahve, Teslim soluk. Yeşil/sarı/kırmızı gecikme ve ödeme için ayrıldığından durumlarda kullanılmaz.
 */
const STATUS_TONE: Record<BoardColumnKey, { label: string; chip: string; bar: string }> = {
    new: { label: 'Onay bekliyor', chip: 'bg-rb-accent text-rb-accent-foreground', bar: 'bg-rb-accent' },
    preparing: { label: 'Mutfakta', chip: 'bg-rb-orange-bg text-rb-orange', bar: 'bg-rb-orange' },
    ready: { label: 'Hazır', chip: 'bg-rb-purple-bg text-rb-purple', bar: 'bg-rb-purple' },
    onTheWay: { label: 'Yolda', chip: 'bg-rb-neutral-bg text-rb-neutral', bar: 'bg-rb-neutral' },
    delivered: { label: 'Teslim edildi', chip: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground/40' },
};

/** Klavye odağı: açık zeminde uygulamanın halka rengi. */
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
/** Koyu gelen kutusunda altın halka. */
const FOCUS_DARK = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rb-gold';

/** "Teslim edildi" bölümünde kasaya alınmışlardan kaç tanesi açık durur; gerisi "Tümünü göster" ile. */
const SETTLED_VISIBLE = 6;

// Gel al siparişine kurye atanmaz; müşteri restorandan alır.
const canAssignCourier = (order: DeliveryOrder) => !order.isPickup
    && (order.status === DeliveryStatus.Accepted || order.status === DeliveryStatus.Preparing || order.status === DeliveryStatus.Ready);

/** Gel al: onaylanmış, müşteriye henüz verilmemiş (mutfak "hazır" demeden de müşteri gelebilir). */
const canHandOverPickup = (order: DeliveryOrder) => !!order.isPickup
    && (order.status === DeliveryStatus.Accepted || order.status === DeliveryStatus.Preparing || order.status === DeliveryStatus.Ready);

function timeOf(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
}

function itemCount(order: DeliveryOrder): number {
    return order.lines.reduce((sum, l) => sum + l.quantity, 0);
}

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toLocaleUpperCase('tr-TR')).join('') || '?';
}

/** Otomatik rete kalan sürenin ne kadarı geçti (0–1). */
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
    const choices: readonly number[] = order.isPickup ? PICKUP_ETA_CHOICES : ETA_CHOICES;
    const suggested = order.suggestedEtaMinutes > 0 ? order.suggestedEtaMinutes : 30;
    return choices.includes(suggested)
        ? [...choices]
        : [...choices, suggested].sort((a, b) => a - b).slice(-4);
}

/**
 * Ödeme şekli: kuryenin kapıda ne tahsil edeceği; gel al'da kasada ne alınacağı. IBAN'da müşteri havale yapar, kurye
 * para almaz.
 */
function paymentInfo(order: DeliveryOrder) {
    const cash = order.paymentPreference === DoorPayment.Nakit;
    const iban = order.paymentPreference === DoorPayment.Iban;
    return {
        Icon: cash ? Banknote : iban ? Landmark : CreditCard,
        label: iban ? 'IBAN (havale)' : `${order.isPickup ? 'Kasada' : 'Kapıda'} ${cash ? 'nakit' : 'kart'}`,
        note: iban ? (order.isPickup ? 'havaleyi kontrol edin' : 'kurye para almaz') : null,
        tone: cash ? 'text-rb-green' : iban ? 'text-rb-purple' : 'text-rb-accent',
    };
}

/** Akış sırası: söz verilen saate en yakın (geciken) üstte; söz yoksa geliş sırası. */
function byPromise(a: DeliveryOrder, b: DeliveryOrder, now: number): number {
    const pa = deliveryLateness(a, now)?.promisedAt.getTime() ?? Infinity;
    const pb = deliveryLateness(b, now)?.promisedAt.getTime() ?? Infinity;
    return pa - pb || a.createdAt.localeCompare(b.createdAt);
}

// Online paket siparişler panosu: kasiyer ekranında sekme, yöneticide /admin/online-orders sayfası.
// Üst satır: bugünün özeti, satış açık/kapalı, ses, görünüm, kurye kasası. "Pano": solda koyu "gelen kutusu" (onay
// bekleyenler; en acili büyük açılır, kabul/ret ve süre orada; diğerleri altında nabız gibi atar), sağda akış (kurye
// şeridi, Mutfakta / Hazır / Yolda satırları, teslim edilenler). "Liste": yoğun şube için tek liste, filtre ve arama.
// "Kurye kasası" sağdan açılan çekmecede. Canlı olaylar uyarılarla aynı bağlantıdan.
export default function OnlineOrdersBoard({ canBlockPhone, className, title, settingsHref }: Props) {
    const [params, setParams] = useSearchParams();
    const [orders, setOrders] = useState<DeliveryOrder[] | null>(null);
    const [couriers, setCouriers] = useState<CourierCashSummary[]>([]);
    const [status, setStatus] = useState<OnlineOrderingStatus | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [view, setView] = useState<View>('board');
    const [now, setNow] = useState(() => Date.now());
    const [pausing, setPausing] = useState(false);
    /** Satırın altında kurye seçicisi açık olan sipariş (aynı anda bir tane). */
    const [pickerFor, setPickerFor] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);
    /** Kabul işlemi süren sipariş. */
    const [actingId, setActingId] = useState<string | null>(null);
    /** Seçilen teslim süresi (seçilmediyse bölgenin önerisi). */
    const [etaFor, setEtaFor] = useState<Record<string, number>>({});
    /** Detay "Reddet" adımında açılsın (gelen kutusunun Reddet düğmesi). */
    const [rejectFor, setRejectFor] = useState<string | null>(null);
    const [deliveredOpen, setDeliveredOpen] = useState(false);
    /** Gelen kutusunda büyük açık sipariş (seçilmediyse otomatik rete en yakın). */
    const [inboxId, setInboxId] = useState<string | null>(null);
    /** Akışta ayrıntısı açık satır. */
    const [expandedId, setExpandedId] = useState<string | null>(null);
    /** Kurye kasası çekmecesi; courierId verilirse o kurye açık gelir. */
    const [kasa, setKasa] = useState<{ courierId?: string } | null>(null);
    const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sound = useSyncExternalStore(onlineOrderSound.subscribe, onlineOrderSound.getState);

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
        // Onay bekleyenler otomatik rete en yakın üstte; teslim edilenler en yeni üstte.
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
            late,
            avgMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
            todayCount: delivered.length,
            todayTotal: delivered.reduce((sum, o) => sum + (o.collectedAmount ?? o.total), 0),
        };
    }, [columns, now]);

    const courierCash = couriers.reduce((sum, c) => sum + c.outstandingCash, 0);

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

    const pickInbox = (id: string) => {
        setInboxId(id);
        markOnlineOrderSeen(id);
    };

    // Teslim edilenler: kuryede duran (kasaya teslim edilmemiş) tahsilat ayrı ve açık; kasaya alınanlar tek satır.
    const unsettled = columns.delivered.filter(o => !o.settledAt);
    const settled = columns.delivered.filter(o => o.settledAt);
    const unsettledTotal = unsettled.reduce((sum, o) => sum + (o.collectedAmount ?? o.total), 0);

    const inboxActive = columns.new.find(o => o.id === inboxId) ?? columns.new[0] ?? null;

    return (
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4', className ?? 'overflow-y-auto p-4 sm:p-6')}>
            <BoardHeader
                title={title}
                settingsHref={settingsHref}
                status={status}
                pausing={pausing}
                onSetOpen={setOpen}
                stats={stats}
                sound={sound}
                view={view}
                onView={setView}
                courierCash={courierCash}
                onOpenKasa={() => setKasa({})}
                onRefresh={() => { load(); loadStatus(); }}
            />

            {status?.enabled && status.paused && (
                <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rb-red/40 bg-rb-red-bg px-4 py-2.5">
                    <p className="flex-1 text-sm font-semibold text-rb-red">Online sipariş durduruldu · müşteriler şu an sipariş veremez.</p>
                    <button type="button" onClick={() => setOpen(true)} disabled={pausing}
                        className={cn('min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground disabled:opacity-50', FOCUS)}>
                        Yeniden aç
                    </button>
                </div>
            )}

            {orders === null ? (
                loadFailed ? (
                    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rb-red/30 bg-rb-red-bg px-4 py-3">
                        <p className="text-sm text-foreground">Online siparişler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
                        <button type="button" onClick={load} className={cn('h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold', FOCUS)}>Tekrar dene</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]" aria-busy="true">
                        <div className="h-96 animate-pulse rounded-[20px] bg-muted" />
                        <div className="flex flex-col gap-4">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
                        </div>
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
                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
                    <Inbox
                        orders={columns.new}
                        active={inboxActive}
                        now={now}
                        paused={!!status?.enabled && status.paused}
                        soundOn={sound === 'on'}
                        onPick={pickInbox}
                        eta={inboxActive ? etaOf(inboxActive) : 0}
                        onEta={m => inboxActive && setEtaFor(prev => ({ ...prev, [inboxActive.id]: m }))}
                        busy={!!inboxActive && actingId === inboxActive.id}
                        onAccept={() => inboxActive && acceptFromCard(inboxActive)}
                        onReject={() => inboxActive && openOrder(inboxActive.id, true)}
                        onOpen={() => inboxActive && openOrder(inboxActive.id)}
                    />

                    <section aria-label="Sipariş akışı" className="flex min-w-0 flex-col gap-5">
                        {couriers.length > 0 && <CourierStrip couriers={couriers} onOpen={id => setKasa({ courierId: id })} />}

                        {FLOW_LANES.map(lane => (
                            <FlowLane
                                key={lane.key}
                                laneKey={lane.key}
                                label={lane.label}
                                hint={lane.key === 'ready'
                                    ? (() => {
                                        const waiting = columns.ready.filter(o => !o.isPickup && !o.courierUserId).length;
                                        const pickups = columns.ready.filter(o => o.isPickup).length;
                                        const parts = [waiting > 0 ? `${waiting} paket kuryesiz` : null, pickups > 0 ? `${pickups} gel al bekliyor` : null];
                                        return parts.filter(Boolean).join(' · ') || undefined;
                                    })()
                                    : lane.hint}
                                empty={lane.empty}
                                orders={[...columns[lane.key]].sort((a, b) => byPromise(a, b, now))}
                                now={now}
                                couriers={couriers}
                                expandedId={expandedId}
                                onToggleExpand={id => setExpandedId(prev => (prev === id ? null : id))}
                                pickerFor={pickerFor}
                                onTogglePicker={togglePicker}
                                assigning={assigning}
                                onAssign={assignFromCard}
                                onOpen={openOrder}
                            />
                        ))}

                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={() => setDeliveredOpen(v => !v)}
                                aria-expanded={deliveredOpen}
                                className={cn('flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-dashed border-border px-4 py-2.5 text-left text-sm text-muted-foreground hover:border-rb-gold', FOCUS)}
                            >
                                <span>Bugün teslim: <b className="tabular-nums text-foreground">{columns.delivered.length}</b></span>
                                <span className="flex items-center gap-2">
                                    {unsettled.length > 0 && <span className="font-semibold text-rb-amber">{unsettled.length} kasaya teslim edilmedi</span>}
                                    <ChevronDown className={cn('h-4 w-4 transition-transform', deliveredOpen && 'rotate-180')} aria-hidden="true" />
                                </span>
                            </button>
                            {deliveredOpen && (
                                <DeliveredSection unsettled={unsettled} unsettledTotal={unsettledTotal} settled={settled} now={now} onOpen={openOrder} wide />
                            )}
                        </div>
                    </section>
                </div>
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

            {kasa && (
                <Modal onClose={() => { setKasa(null); load(); }} overlayClassName="z-80 items-stretch justify-end overflow-hidden bg-black/40 backdrop-blur-[2px]">
                    <aside className="flex h-dvh w-full max-w-[600px] flex-col bg-background shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right-10 motion-safe:fade-in motion-safe:duration-200">
                        <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
                            <ModalTitle className="font-serif text-3xl font-semibold leading-none text-foreground">Kurye kasası</ModalTitle>
                            <button type="button" onClick={() => { setKasa(null); load(); }} aria-label="Kapat"
                                className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground', FOCUS)}>
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                            <CourierCashPanel initialCourierId={kasa.courierId} />
                        </div>
                    </aside>
                </Modal>
            )}
        </div>
    );
}

// ── Üst satır ─────────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
    title?: string;
    settingsHref?: string;
    status: OnlineOrderingStatus | null;
    pausing: boolean;
    onSetOpen: (open: boolean) => void;
    stats: { late: number; avgMinutes: number | null; todayCount: number; todayTotal: number };
    sound: ReturnType<typeof onlineOrderSound.getState>;
    view: View;
    onView: (view: View) => void;
    courierCash: number;
    onOpenKasa: () => void;
    onRefresh: () => void;
}

// Solda başlık ve bugünün özeti (teslim, ciro, ortalama süre, geciken); sağda satış anahtarı, ses, görünüm, kurye kasası.
function BoardHeader({ title, settingsHref, status, pausing, onSetOpen, stats, sound, view, onView, courierCash, onOpenKasa, onRefresh }: HeaderProps) {
    const open = !!status?.enabled && !status.paused;
    const ctl = cn('inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold', FOCUS);

    return (
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6">
                {title && <h1 className="font-serif text-[32px] font-semibold leading-none text-foreground">{title}</h1>}
                <p className="text-sm text-muted-foreground">
                    Bugün <b className="tabular-nums text-foreground">{stats.todayCount} teslim</b>
                    {' · '}<b className="tabular-nums text-foreground">₺{formatPrice(stats.todayTotal)}</b>
                    {stats.avgMinutes !== null && <>{' · '}ort. <b className="tabular-nums text-foreground">{stats.avgMinutes} dk</b></>}
                    {stats.late > 0 && <>{' · '}<b className="tabular-nums text-rb-red">{stats.late} geciken</b></>}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {!status ? (
                    <span className={cn(ctl, 'border-border bg-card text-muted-foreground')}>Durum okunuyor…</span>
                ) : !status.enabled ? (
                    <span className={cn(ctl, 'border-border bg-card text-muted-foreground')}>
                        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-muted-foreground/50" />Ayarlarda kapalı
                    </span>
                ) : (
                    <button
                        type="button"
                        role="switch"
                        aria-checked={open}
                        disabled={pausing}
                        onClick={() => onSetOpen(!open)}
                        title={open ? 'Durdurmak için dokunun' : 'Yeniden açmak için dokunun'}
                        className={cn(ctl, 'disabled:opacity-50', open ? 'border-rb-green/30 bg-rb-green-bg text-rb-green' : 'border-rb-red/30 bg-rb-red-bg text-rb-red')}
                    >
                        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', open ? 'bg-rb-green motion-safe:animate-pulse' : 'bg-rb-red')} />
                        {open ? 'Siparişe açık' : 'Siparişe kapalı'}
                    </button>
                )}

                <button
                    type="button"
                    data-online-order-sound-toggle
                    onClick={onlineOrderSound.toggle}
                    aria-pressed={sound === 'on'}
                    title={sound === 'locked' ? 'Tarayıcı sesi bekletiyor; açmak için dokunun' : sound === 'on' ? 'Sesi kapat' : 'Sesi aç'}
                    className={cn(ctl,
                        sound === 'on' ? 'border-border bg-card text-foreground'
                            : sound === 'locked' ? 'border-rb-amber/50 bg-rb-amber-bg text-rb-amber'
                                : 'border-border bg-muted text-muted-foreground'
                    )}
                >
                    {sound === 'on' ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
                    {sound === 'on' ? 'Ses açık' : sound === 'locked' ? 'Ses kilitli · aç' : 'Ses kapalı'}
                </button>

                <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-border sm:block" />

                <div className="inline-flex overflow-hidden rounded-xl border border-border bg-card" role="tablist" aria-label="Görünüm">
                    {([['board', 'Pano', Columns3], ['list', 'Liste', List]] as const).map(([key, label, Icon]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={view === key}
                            onClick={() => onView(key)}
                            className={cn(
                                'flex min-h-11 items-center gap-1.5 px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                                view === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" />{label}
                        </button>
                    ))}
                </div>

                <button type="button" onClick={onOpenKasa} className={cn(ctl, 'border-rb-gold/60 bg-rb-gold-bg text-foreground hover:bg-rb-gold/20')}>
                    <Bike className="h-4 w-4" aria-hidden="true" />Kurye kasası · <b className="tabular-nums">₺{formatPrice(courierCash)}</b>
                </button>

                <button
                    type="button"
                    onClick={onRefresh}
                    aria-label="Yenile"
                    title="Yenile"
                    className={cn('flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground', FOCUS)}
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>

                {settingsHref && (
                    <Link to={settingsHref} className={cn(ctl, 'border-border bg-card text-foreground hover:border-rb-gold')}>
                        <Settings className="h-4 w-4" aria-hidden="true" />Ayarlar
                    </Link>
                )}
            </div>
        </div>
    );
}

// ── Gelen kutusu (onay bekleyenler) ───────────────────────────────────────────────────────────

interface InboxProps {
    orders: DeliveryOrder[];
    active: DeliveryOrder | null;
    now: number;
    paused: boolean;
    soundOn: boolean;
    onPick: (id: string) => void;
    eta: number;
    onEta: (minutes: number) => void;
    busy: boolean;
    onAccept: () => void;
    onReject: () => void;
    onOpen: () => void;
}

// Koyu panel: her iki temada da koyu kalsın diye "dark" kapsamıyla uygulamanın koyu tema değişkenlerini kullanır.
// En acil sipariş büyük açılır (geri sayım halkası, müşteri, kalemler, süre, kabul/ret); diğerleri altında nabız gibi atar.
function Inbox({ orders, active, now, paused, soundOn, onPick, eta, onEta, busy, onAccept, onReject, onOpen }: InboxProps) {
    const others = orders.filter(o => o !== active);
    return (
        <section
            aria-label="Onay bekleyen siparişler"
            className="dark flex flex-col overflow-hidden rounded-[20px] bg-card text-foreground shadow-lg ring-1 ring-rb-gold/25 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-8rem)]"
        >
            <header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                <h2 className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[.14em] text-rb-gold">
                    <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full bg-rb-gold', orders.length > 0 ? 'online-order-pulse online-order-pulse-fast' : 'opacity-30')} />
                    Onay bekliyor
                </h2>
                <span className="font-serif text-[28px] leading-none tabular-nums text-rb-gold" aria-label={`${orders.length} sipariş`}>{orders.length}</span>
            </header>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {active ? (
                    <>
                        <InboxCard
                            key={active.id}
                            order={active}
                            now={now}
                            eta={eta}
                            onEta={onEta}
                            busy={busy}
                            onAccept={onAccept}
                            onReject={onReject}
                            onOpen={onOpen}
                        />
                        {others.length > 0 && (
                            <ul className="mt-2 flex flex-col gap-2.5" aria-label="Sırada bekleyenler">
                                {others.map(o => {
                                    const urgent = isUrgent(o, now);
                                    return (
                                        <li key={o.id}>
                                            <button
                                                type="button"
                                                onClick={() => onPick(o.id)}
                                                aria-label={`Sipariş #${o.number}, ${o.customerName}: büyük aç`}
                                                className={cn(
                                                    'online-order-pulse flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-foreground/[.04] px-4 py-3 text-left hover:bg-foreground/[.08]',
                                                    urgent ? 'border-rb-red/60' : 'border-border',
                                                    FOCUS_DARK
                                                )}
                                            >
                                                <span className="font-serif text-xl tabular-nums text-rb-gold">#{o.number}</span>
                                                <span className="min-w-0 flex-1 text-sm">
                                                    <b className="block truncate">{o.customerName}</b>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {[o.isPickup ? 'Gel al' : o.zoneName, `${itemCount(o)} ürün`, `₺${formatPrice(o.total)}`].filter(Boolean).join(' · ')}
                                                    </span>
                                                </span>
                                                {o.autoRejectAt && (
                                                    <b className={cn('text-[15px] tabular-nums', urgent && 'text-rb-red')}>{countdownText(o.autoRejectAt, now)}</b>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-14 text-center">
                        <p className="font-serif text-3xl text-foreground/85">Yeni sipariş yok</p>
                        <p className="max-w-64 text-sm text-muted-foreground">
                            {paused
                                ? 'Online sipariş durduruldu; müşteriler şu an sipariş veremez.'
                                : `Sipariş gelince burada büyük açılır${soundOn ? ' ve ses çalar' : ''}.`}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

// Otomatik rete kalan süre halkası (dolu = süre bol). Son 2 dakikada kırmızı.
function CountdownRing({ order, now }: { order: DeliveryOrder; now: number }) {
    const circumference = 2 * Math.PI * 36;
    const has = !!order.autoRejectAt;
    const left = has ? 1 - autoRejectProgress(order, now) : 1;
    const urgent = isUrgent(order, now);
    const text = has ? countdownText(order.autoRejectAt!, now) : formatElapsed(order.createdAt, now);
    return (
        <div
            className="relative h-[84px] w-[84px] shrink-0"
            role="img"
            aria-label={has ? `Otomatik rete kalan süre ${text}` : `${text} önce geldi`}
        >
            <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="42" cy="42" r="36" fill="none" stroke="currentColor" strokeWidth="5" className="text-foreground/10" />
                <circle
                    cx="42" cy="42" r="36" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(circumference * left).toFixed(1)} ${circumference.toFixed(1)}`}
                    className={cn('transition-[stroke-dasharray] duration-1000 ease-linear', urgent ? 'text-rb-red' : 'text-rb-gold')}
                />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
                <b className={cn('text-lg tabular-nums leading-tight', urgent && 'text-rb-red')}>{text}</b>
                <span className="text-[9px] tracking-[.12em] text-muted-foreground">{has ? 'YANITLA' : 'BEKLİYOR'}</span>
            </span>
        </div>
    );
}

function InboxCard({ order, now, eta, onEta, busy, onAccept, onReject, onOpen }: {
    order: DeliveryOrder; now: number; eta: number; onEta: (m: number) => void; busy: boolean;
    onAccept: () => void; onReject: () => void; onOpen: () => void;
}) {
    const pay = paymentInfo(order);
    const PayIcon = pay.Icon;
    return (
        <article aria-label={`Sipariş #${order.number} · onay bekliyor`} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
            <div className="flex items-center gap-4">
                <CountdownRing order={order} now={now} />
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                        #{order.number} · {timeOf(order.createdAt)} geldi{order.autoRejectAt ? ' · yanıtlamazsan otomatik reddedilir' : ''}
                    </p>
                    <p className="mt-1 break-words font-serif text-[28px] font-semibold leading-[1.1]">{order.customerName}</p>
                    <a href={telUrl(order.customerPhone)} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-semibold tabular-nums text-rb-gold', FOCUS_DARK)}>
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />{order.customerPhone}
                    </a>
                </div>
            </div>

            {order.isPickup && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-foreground/[.06] px-3.5 py-3 text-sm leading-relaxed">
                    <PickupBadge />
                    <span className="min-w-0 break-words">Müşteri restorana gelip alacak · kurye yok</span>
                </div>
            )}
            {!order.isPickup && (order.zoneName || order.address) && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-foreground/[.06] px-3.5 py-3 text-sm leading-relaxed">
                    <MapPin className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                        {order.zoneName && <b className="text-rb-gold">{order.zoneName}</b>}
                        {order.zoneName && order.address ? ' · ' : ''}{order.address}
                        {order.addressDirections && <span className="block text-xs text-muted-foreground">Tarif: {order.addressDirections}</span>}
                    </span>
                </div>
            )}

            <ul className="mt-3.5 flex flex-col gap-2">
                {order.lines.map((line, i) => (
                    <li key={i} className="flex items-baseline gap-2.5 text-[15px]">
                        <b className="w-7 shrink-0 tabular-nums text-rb-gold">{line.quantity}×</b>
                        <span className="min-w-0 flex-1 break-words">
                            {line.name}
                            {line.selections.length > 0 && <span className="block text-xs text-muted-foreground">{line.selections.join(', ')}</span>}
                            {line.note && <span className="block text-xs font-semibold text-rb-amber">Not: {line.note}</span>}
                        </span>
                        <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">₺{formatAmount(line.lineTotal)}</span>
                    </li>
                ))}
            </ul>

            {order.note && (
                <p className="mt-3 flex items-start gap-2 rounded-r-xl border-l-[3px] border-rb-gold bg-rb-gold/[.12] px-3.5 py-2.5 text-sm">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-rb-gold" aria-hidden="true" />
                    <span className="min-w-0 break-words"><span className="sr-only">Sipariş notu: </span>“{order.note}”</span>
                </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3.5">
                <span className="font-serif text-[30px] font-semibold leading-none tabular-nums">₺{formatPrice(order.total)}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-2.5 py-1 text-xs font-semibold">
                    <PayIcon className={cn('h-3.5 w-3.5', pay.tone)} aria-hidden="true" />
                    {pay.label}{pay.note && <span className="text-muted-foreground">· {pay.note}</span>}
                </span>
            </div>

            <button type="button" onClick={onOpen}
                className={cn('mt-2 min-h-11 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline', FOCUS_DARK)}>
                Tüm ayrıntılar · numara engelleme
            </button>

            <p id={`eta-${order.id}`} className="mt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Müşteriye söylenecek süre</p>
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-labelledby={`eta-${order.id}`}>
                {etaChoicesFor(order).map(m => (
                    <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={eta === m}
                        onClick={() => onEta(m)}
                        className={cn(
                            'flex h-11 flex-1 items-center justify-center rounded-[10px] border text-sm font-semibold tabular-nums transition-colors',
                            eta === m ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-foreground/20 text-foreground hover:border-rb-gold',
                            FOCUS_DARK
                        )}
                    >
                        {m} dk
                    </button>
                ))}
            </div>
            <div className="mt-3 flex gap-2.5">
                <button type="button" onClick={onReject} disabled={busy}
                    className={cn('h-14 w-28 shrink-0 rounded-xl border border-foreground/25 text-[15px] font-semibold hover:border-rb-red hover:text-rb-red disabled:opacity-50', FOCUS_DARK)}>
                    Reddet
                </button>
                <button type="button" onClick={onAccept} disabled={busy}
                    className={cn('flex h-14 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rb-gold px-3 text-base font-bold text-rb-gold-foreground hover:brightness-105 disabled:opacity-50', FOCUS_DARK)}>
                    <Check className="h-5 w-5" aria-hidden="true" />{busy ? 'Kabul ediliyor…' : `Kabul et · ${eta} dk`}
                </button>
            </div>
        </article>
    );
}

// ── Akış ──────────────────────────────────────────────────────────────────────────────────────

// Kurye şeridi: her kurye bir kutu; durumu (boşta / yolda), üzerindeki nakit; önceki günden kalan para kırmızı.
// Dokununca kurye kasası o kurye açık gelir.
function CourierStrip({ couriers, onOpen }: { couriers: CourierCashSummary[]; onOpen: (id: string) => void }) {
    const sorted = [...couriers].sort((a, b) => b.outstandingCash - a.outstandingCash || a.fullName.localeCompare(b.fullName, 'tr'));
    return (
        <ul className="-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1" aria-label="Kuryeler">
            {sorted.map(c => {
                const onRoad = c.onTheWayCount > 0;
                const free = c.openOrderCount === 0;
                const old = c.previousDayCash > 0;
                return (
                    <li key={c.userId} className="min-w-[230px] max-w-[360px] flex-1">
                        <button
                            type="button"
                            onClick={() => onOpen(c.userId)}
                            aria-label={`${c.fullName} · kurye kasasını aç`}
                            className={cn(
                                'flex min-h-14 w-full items-center gap-2.5 rounded-2xl border bg-card px-3 py-2.5 text-left hover:border-rb-gold',
                                old ? 'border-rb-red/45' : 'border-border',
                                FOCUS
                            )}
                        >
                            <span aria-hidden="true" className={cn(
                                'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                onRoad ? 'bg-foreground text-rb-gold' : 'bg-rb-gold/25 text-foreground'
                            )}>{initials(c.fullName)}</span>
                            <span className="min-w-0 flex-1">
                                <b className="block truncate text-sm text-foreground">{c.fullName}</b>
                                <span className={cn('block truncate text-xs', onRoad ? 'text-rb-amber' : free ? 'text-rb-green' : 'text-rb-accent')}>{courierLoadText(c)}</span>
                            </span>
                            <span className="shrink-0 text-right">
                                <b className="block text-[15px] tabular-nums text-foreground">₺{formatPrice(c.outstandingCash)}</b>
                                <span className={cn('text-[11px]', old ? 'font-semibold text-rb-red' : 'text-muted-foreground')}>
                                    {old ? 'önceki günden kalan' : 'kuryede nakit'}
                                </span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

interface FlowLaneProps {
    laneKey: FlowLaneKey;
    label: string;
    hint?: string;
    empty: string;
    orders: DeliveryOrder[];
    now: number;
    couriers: CourierCashSummary[];
    expandedId: string | null;
    onToggleExpand: (id: string) => void;
    pickerFor: string | null;
    onTogglePicker: (id: string) => void;
    assigning: boolean;
    onAssign: (order: DeliveryOrder, courierUserId: string | null) => void;
    onOpen: (id: string) => void;
}

function FlowLane({ laneKey, label, hint, empty, orders, ...rowProps }: FlowLaneProps) {
    const headingId = `lane-${laneKey}`;
    return (
        <section aria-labelledby={headingId}>
            <div className="mx-1 mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', STATUS_TONE[laneKey].bar)} />
                <h2 id={headingId} className="font-serif text-[22px] font-semibold leading-none text-foreground">{label}</h2>
                <span className="inline-flex h-[22px] min-w-6 items-center justify-center rounded-full bg-foreground/[.08] px-2 text-xs font-bold tabular-nums text-foreground" aria-label={`${orders.length} sipariş`}>
                    {orders.length}
                </span>
                {hint && <span className={cn('text-xs', laneKey === 'ready' ? 'font-semibold text-rb-purple' : 'text-muted-foreground')}>{hint}</span>}
            </div>
            <div className="@container overflow-hidden rounded-2xl border border-border bg-card">
                {orders.length === 0 ? (
                    <p className="px-4 py-3.5 text-sm italic text-muted-foreground">{empty}</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {orders.map(order => <FlowRow key={order.id} order={order} {...rowProps} />)}
                    </ul>
                )}
            </div>
        </section>
    );
}

// Söz verilen saate göre süre hapı: yeşil zamanında, sarı son dakikalar, kırmızı gecikti. Söz yoksa geçen süre.
function TimePill({ order, now }: { order: DeliveryOrder; now: number }) {
    const lateness = deliveryLateness(order, now);
    const base = 'inline-flex h-7 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold tabular-nums';
    if (!lateness) {
        return (
            <span className={cn(base, 'bg-muted text-muted-foreground')} title={`Sipariş ${timeOf(order.createdAt)}`}>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />{formatElapsed(order.createdAt, now)}
            </span>
        );
    }
    const promised = timeOf(lateness.promisedAt.toISOString());
    const late = lateness.level === 'late';
    return (
        <span
            title={`Müşteriye söz verilen teslim saati ${promised}`}
            className={cn(base, late ? 'bg-rb-red-bg text-rb-red' : lateness.level === 'soon' ? 'bg-rb-amber-bg text-rb-amber' : 'bg-rb-green-bg text-rb-green')}
        >
            {late && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
            {late ? `${lateness.minutes} dk gecikti` : `${lateness.minutes} dk kaldı`}
            <span className="font-normal opacity-80">· {promised}</span>
        </span>
    );
}

type FlowRowProps = Omit<FlowLaneProps, 'laneKey' | 'label' | 'hint' | 'empty' | 'orders'> & { order: DeliveryOrder };

// Akış satırı: süre hapı · numara, müşteri, bölge ve kalem özeti (dokununca ayrıntı) · tutar ve ödeme · o adımın işi.
// Mutfakta: kurye atanabilir (isteğe bağlı). Hazır: kuryesizse "Kuryeye ver" ana iş. Yolda: kurye ve çıkış süresi.
// "Hazır" mutfaktan, "Yolda" ve "Teslim" kuryenin ekranından gelir; burada düğmesi yoktur.
function FlowRow({ order, now, couriers, expandedId, onToggleExpand, pickerFor, onTogglePicker, assigning, onAssign, onOpen }: FlowRowProps) {
    const expanded = expandedId === order.id;
    const pickerOpen = pickerFor === order.id;
    const pay = paymentInfo(order);
    const isReady = order.status === DeliveryStatus.Ready;
    const onTheWay = order.status === DeliveryStatus.OnTheWay;
    const needsCourier = isReady && !order.isPickup && !order.courierUserId;
    const detailsId = `flow-${order.id}`;

    const summary = [
        order.lines.map(l => `${l.quantity}× ${l.name}`).join(', '),
        order.status === DeliveryStatus.Accepted ? order.statusLabel : null,
        !onTheWay && order.courierName ? `kurye ${order.courierName}` : null,
    ].filter(Boolean).join(' · ');

    let action: ReactNode = null;
    if (onTheWay) {
        action = (
            <span className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
                <Bike className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">
                    <b className="font-semibold text-foreground">{order.courierName ?? 'Kurye'}</b>
                    {order.dispatchedAt ? ` · ${formatElapsed(order.dispatchedAt, now)} önce çıktı` : ' · yolda'}
                </span>
            </span>
        );
    } else if (canHandOverPickup(order)) {
        // Gel al: kurye yok; müşteri gelince ödemeyi alıp "Müşteri aldı" (detayda kasa ve ödeme seçilir).
        action = (
            <button
                type="button"
                onClick={() => onOpen(order.id)}
                className={cn(
                    'flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition-colors',
                    isReady ? 'bg-foreground text-background hover:opacity-90' : 'border border-border bg-card text-foreground hover:border-rb-gold',
                    FOCUS
                )}
            >
                Müşteri aldı →
            </button>
        );
    } else if (canAssignCourier(order)) {
        action = (
            <button
                type="button"
                onClick={() => onTogglePicker(order.id)}
                aria-expanded={pickerOpen}
                className={cn(
                    'flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition-colors',
                    needsCourier && !pickerOpen
                        ? 'bg-foreground text-background hover:opacity-90'
                        : 'border border-border bg-card text-foreground hover:border-rb-gold',
                    FOCUS
                )}
            >
                {pickerOpen ? 'Vazgeç'
                    : needsCourier ? 'Kuryeye ver →'
                        : order.courierName ? (
                            <span className="flex min-w-0 items-center gap-1.5">
                                <Bike className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="truncate">{order.courierName}</span>
                                <span className="shrink-0 font-normal text-muted-foreground">· değiştir</span>
                            </span>
                        ) : <><Bike className="h-4 w-4" aria-hidden="true" />Kurye ata</>}
            </button>
        );
    }

    return (
        <li className={cn((needsCourier || (order.isPickup && isReady)) && 'bg-rb-purple-bg/60')}>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/40 @3xl:grid @3xl:grid-cols-[150px_minmax(0,1fr)_130px_190px]">
                <span className="order-1"><TimePill order={order} now={now} /></span>
                <span className="order-2 ml-auto text-right text-[13px] leading-tight @3xl:order-3 @3xl:ml-0">
                    <b className="block text-base tabular-nums text-foreground">₺{formatPrice(order.total)}</b>
                    <span className={cn('font-semibold', pay.tone)}>{pay.label}</span>
                    {pay.note && <span className="block text-[11px] text-muted-foreground">{pay.note}</span>}
                </span>
                <button
                    type="button"
                    onClick={() => onToggleExpand(order.id)}
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    className={cn('order-3 min-h-11 w-full min-w-0 rounded-lg text-left @3xl:order-2', FOCUS)}
                >
                    <span className="block truncate text-[15px] font-semibold text-foreground">
                        <span className="mr-1.5 font-serif text-lg font-bold tabular-nums">#{order.number}</span>
                        {order.customerName}
                        {order.isPickup
                            ? <PickupBadge className="ml-1.5" />
                            : order.zoneName && <span className="font-normal text-muted-foreground"> · {order.zoneName}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="min-w-0 truncate">{summary}</span>
                        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                    </span>
                </button>
                <div className="order-4 w-full min-w-0 @3xl:w-auto">{action}</div>
            </div>

            {expanded && (
                <div id={detailsId} className="grid gap-4 px-4 pb-4 text-[13px] leading-relaxed motion-safe:animate-in motion-safe:fade-in @3xl:grid-cols-2 @3xl:pl-[180px]">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{order.isPickup ? 'Teslim' : 'Adres'}</p>
                        <p className="break-words text-foreground">
                            {order.isPickup
                                ? 'Gel al · müşteri restorandan alacak'
                                : <>{order.zoneName && <b>{order.zoneName}</b>}{order.zoneName && order.address ? ' · ' : ''}{order.address}</>}
                        </p>
                        {order.addressDirections && <p className="text-muted-foreground">Tarif: {order.addressDirections}</p>}
                        <a href={telUrl(order.customerPhone)} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded font-semibold tabular-nums text-rb-accent', FOCUS)}>
                            <Phone className="h-3.5 w-3.5" aria-hidden="true" />{order.customerPhone}
                        </a>
                        {order.note && (
                            <p className="mt-1 rounded-r-lg border-l-[3px] border-rb-gold bg-rb-gold-bg px-3 py-2 text-foreground">
                                <span className="sr-only">Sipariş notu: </span>“{order.note}”
                            </p>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Ürünler · {itemCount(order)}</p>
                        <ul>
                            {order.lines.map((line, i) => (
                                <li key={i} className="break-words text-foreground">
                                    <b>{line.quantity}×</b> {line.name}
                                    {line.selections.length > 0 && <span className="block pl-5 text-xs text-muted-foreground">{line.selections.join(', ')}</span>}
                                    {line.note && <span className="block pl-5 text-xs font-semibold text-rb-amber">Not: {line.note}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="@3xl:col-span-2">
                        <button type="button" onClick={() => onOpen(order.id)}
                            className={cn('min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:border-rb-gold', FOCUS)}>
                            Tüm ayrıntılar · iptal
                        </button>
                    </div>
                </div>
            )}

            {pickerOpen && canAssignCourier(order) && (
                <div className="px-4 pb-4 motion-safe:animate-in motion-safe:fade-in @3xl:pl-[180px]">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Kurye seç</p>
                    <div className="max-w-md">
                        <CourierPicker couriers={couriers} selectedId={order.courierUserId} disabled={assigning} onPick={id => onAssign(order, id)} />
                    </div>
                </div>
            )}
        </li>
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
    const grid = wide ? 'grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3' : 'flex flex-col gap-2';
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
    const method = doorPaymentWord(order.collectedMethod ?? order.paymentPreference);
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
                <span className="min-w-0 truncate">{timeOf(order.deliveredAt)}{order.isPickup ? ' · müşteri aldı' : order.courierName ? ` · ${order.courierName}` : ''}</span>
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
    const pill = STATUS_TONE[key];
    const isNew = order.status === DeliveryStatus.Received;
    const urgent = isNew && isUrgent(order, now);
    const canAssign = canAssignCourier(order);
    const cash = order.paymentPreference === DoorPayment.Nakit;

    return (
        <li className={cn(isNew && 'bg-rb-accent/[.05]')}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 lg:grid lg:grid-cols-[minmax(0,1.6fr)_120px_90px_130px_110px_minmax(0,1fr)_minmax(0,1.2fr)]">
                <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left lg:flex-none">
                    <span className="block truncate font-serif text-lg font-bold text-foreground">{orderTitle(order)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{order.customerName} · {itemCount(order)} ürün</span>
                </button>
                <span><span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', pill.chip)}>{pill.label}</span></span>
                <span className={cn('text-sm tabular-nums', isNew ? cn('font-bold', urgent ? 'text-rb-red' : 'text-rb-amber') : 'text-muted-foreground')}>
                    {isNew && order.autoRejectAt ? `ret ${countdownText(order.autoRejectAt, now)}` : formatElapsed(order.createdAt, now)}
                </span>
                <span className="min-w-0">{isNew ? <span className="text-sm text-muted-foreground">—</span> : <LatenessBadge order={order} now={now} />}</span>
                <span className="ml-auto text-right font-serif text-lg font-bold tabular-nums text-foreground lg:ml-0">
                    ₺{formatPrice(order.total)}{' '}
                    <span className={cn('font-sans text-[10px] font-bold', cash ? 'text-rb-green' : order.paymentPreference === DoorPayment.Iban ? 'text-rb-purple' : 'text-rb-accent')}>
                        {cash ? 'NAKİT' : order.paymentPreference === DoorPayment.Iban ? 'IBAN' : 'KART'}
                    </span>
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
                    ) : order.isPickup ? (
                        <PickupBadge />
                    ) : (
                        <span className="text-sm font-semibold text-foreground">{order.courierName ?? <span className="text-muted-foreground">—</span>}</span>
                    )}
                </span>
                <span className="flex w-full justify-end gap-2 lg:w-auto">
                    {canHandOverPickup(order) && (
                        <button type="button" onClick={onOpen}
                            className="flex h-10 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:border-rb-gold">
                            Müşteri aldı →
                        </button>
                    )}
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
