import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    AlertTriangle, Banknote, Bike, Check, ChefHat, ChevronDown, CreditCard, Landmark, Navigation, Phone, RefreshCw, Undo2,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { courierService } from '@/features/courier/api/courierService';
import {
    DoorPayment, doorPaymentLabel, doorPaymentWord, mapsUrl, telUrl,
    type CourierDaySummary, type CourierOrder, type DoorPaymentMethod,
} from '@/features/courier/types';
import { createHubConnection } from '@/lib/signalrConnection';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const Status = { Accepted: 2, Preparing: 3, Ready: 4, OnTheWay: 5, Delivered: 6 } as const;

// Hub olayı kaçarsa (mutfak "hazır" dediğinde kuryeye ayrıca olay gitmez) liste bu aralıkla da tazelenir.
const POLL_MS = 30_000;

function timeOf(iso?: string | null): string {
    return iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
}

/** "12 dk" / "1 sa 5 dk": verilen andan bu yana geçen süre. */
function elapsedText(iso: string, now: number): string {
    const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
    if (minutes < 60) return `${minutes} dk`;
    const rest = minutes % 60;
    return rest ? `${Math.floor(minutes / 60)} sa ${rest} dk` : `${Math.floor(minutes / 60)} sa`;
}

/** Geri alma süresi hâlâ açık mı (sunucunun verdiği son ana göre). */
function canUndo(order: CourierOrder, now: number): boolean {
    return !!order.undoDeliverUntil && new Date(order.undoDeliverUntil).getTime() > now;
}

/** Söz verilen saate kalan (artı) ya da geçen (eksi) dakika; söz yoksa null. */
function promiseMinutes(order: CourierOrder, now: number): number | null {
    if (!order.estimatedDeliveryAt) return null;
    const diff = (new Date(order.estimatedDeliveryAt).getTime() - now) / 60_000;
    return diff >= 0 ? Math.ceil(diff) : -Math.max(1, Math.floor(-diff));
}

function promiseText(order: CourierOrder, now: number): string | null {
    const minutes = promiseMinutes(order, now);
    if (minutes === null) return null;
    const at = timeOf(order.estimatedDeliveryAt);
    return minutes >= 0 ? `Söz verilen saat ${at} · ${minutes} dk kaldı` : `Söz verilen saat ${at} · ${-minutes} dk gecikti`;
}

// Sıradaki iş: önce yoldaki paketler (teslim), sonra hazır olanlar (yola çık), en son mutfaktakiler. Grup içinde söz
// verilen saate göre (sözü olmayan en sona).
function jobRank(order: CourierOrder): number {
    return order.canDeliver ? 0 : order.canDispatch ? 1 : 2;
}

function byNextJob(a: CourierOrder, b: CourierOrder): number {
    const rank = jobRank(a) - jobRank(b);
    if (rank !== 0) return rank;
    const at = (o: CourierOrder) => o.estimatedDeliveryAt ?? o.acceptedAt ?? '9999';
    return at(a).localeCompare(at(b));
}

// Mutfaktaki sürenin ve geri alma düğmesinin kendiliğinden güncellenmesi için.
const TICK_MS = 5_000;
// Teslim bildirimindeki "Geri al" ne kadar ekranda kalır (sunucuda geri alma süresi 2 dk; sonrası listedeki düğmeden).
const UNDO_TOAST_MS = 20_000;

function methodWord(method: DoorPaymentMethod): string {
    return doorPaymentWord(method);
}

// Kurye ekranı: telefonda, tek elle ve güneş altında. Ekranda tek iş (sıradaki paket) büyük kartta; ana düğme hep
// aynı yerde, ekranın altında başparmağın altında. Kurye yalnızca kendisine atanmış siparişleri görür.
export default function CourierDashboardPage() {
    const [orders, setOrders] = useState<CourierOrder[]>([]);
    const [summary, setSummary] = useState<CourierDaySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [deliverTarget, setDeliverTarget] = useState<CourierOrder | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    /** Kuryenin "Sonra" listesinden öne aldığı sipariş; yoksa sıra kendiliğinden. */
    const [focusId, setFocusId] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const loadSeq = useRef(0);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
        return () => window.clearInterval(timer);
    }, []);

    const load = useCallback(() => {
        const seq = ++loadSeq.current;
        Promise.all([courierService.getOrders(), courierService.getSummary()])
            .then(([nextOrders, nextSummary]) => {
                if (seq !== loadSeq.current) return;
                setOrders(nextOrders);
                setSummary(nextSummary);
                setLoadFailed(false);
            })
            .catch(() => { if (seq === loadSeq.current) setLoadFailed(true); })
            .finally(() => { if (seq === loadSeq.current) setLoading(false); });
    }, []);

    useEffect(() => {
        load();

        const { connection, stop } = createHubConnection('/courier-hub');
        connection.on('CourierOrdersChanged', load);
        connection.onreconnected(load);
        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });

        // Telefon kilitten açılınca ya da sekmeye dönünce güncel listeyi çek.
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        window.addEventListener('focus', load);
        document.addEventListener('visibilitychange', onVisible);
        const poll = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);

        return () => {
            cancelled = true;
            stop();
            window.removeEventListener('focus', load);
            document.removeEventListener('visibilitychange', onVisible);
            window.clearInterval(poll);
        };
    }, [load]);

    const dispatch = async (order: CourierOrder) => {
        setBusyId(order.id);
        try {
            await courierService.dispatch(order.id);
            toast.success(`PAKET #${order.number} yolda.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Yola çıkış kaydedilemedi. Tekrar deneyin.'));
        } finally {
            setBusyId(null);
            load();
        }
    };

    const undoDeliver = async (order: CourierOrder) => {
        setBusyId(order.id);
        try {
            await courierService.undoDeliver(order.id);
            toast.success(`PAKET #${order.number} teslimi geri alındı, sipariş yeniden yolda.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Teslim geri alınamadı.'));
        } finally {
            setBusyId(null);
            load();
        }
    };

    const deliver = async (order: CourierOrder, method: DoorPaymentMethod) => {
        setBusyId(order.id);
        try {
            await courierService.deliver(order.id, method);
            setDeliverTarget(null);
            setFocusId(null);
            // Yanlış düğmeye basıldıysa: bildirimde 20 sn "Geri al" durur; 2 dk dolana kadar listede de düğme var.
            toast.success(`PAKET #${order.number} teslim edildi · ${methodWord(method)} ₺${formatPrice(order.total)}`, {
                duration: UNDO_TOAST_MS,
                action: { label: 'Geri al', onClick: () => { void undoDeliver(order); } },
            });
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Teslim kaydedilemedi. Tekrar deneyin.'));
        } finally {
            setBusyId(null);
            load();
        }
    };

    const active = orders.filter(o => o.status !== Status.Delivered).sort(byNextJob);
    const delivered = orders.filter(o => o.status === Status.Delivered);
    const ready = active.filter(o => o.canDispatch);
    const current = active.find(o => o.id === focusId) ?? active[0] ?? null;
    const later = current ? active.filter(o => o.id !== current.id) : [];

    const dispatchAll = async () => {
        setBulkBusy(true);
        try {
            const result = await courierService.dispatchMany(ready.map(o => o.id));
            const numbers = result.dispatchedNumbers.map(n => `#${n}`).join(', ');
            toast.success(`${result.dispatchedCount} paket yolda: ${numbers}.`);
            if (result.skippedCount > 0) {
                toast.warning(`${result.skippedCount} sipariş artık hazır değil ya da size atanmamış; listeye bakın.`);
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Yola çıkış kaydedilemedi. Tekrar deneyin.'));
        } finally {
            setBulkBusy(false);
            setFocusId(null);
            load();
        }
    };

    const anyBusy = bulkBusy || busyId !== null;

    return (
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
            <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-3 pt-3 pb-4 sm:px-4">
                {/* Üst satır: sıra bilgisi, üzerindeki nakit ve yenile */}
                <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                        {active.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rb-accent" aria-hidden="true" />}
                        {active.length > 0 ? `Sıradaki · 1 / ${active.length}` : 'Siparişlerim'}
                    </p>
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-flex h-11 items-center gap-2 rounded-full bg-rb-green-bg px-3.5 text-sm font-bold tabular-nums text-rb-green"
                            title="Kasaya teslim edeceğiniz nakit"
                        >
                            <Banknote className="h-4 w-4" aria-hidden="true" />
                            ₺{formatPrice(summary?.outstandingCash ?? 0)} üzerimde
                        </span>
                        <button
                            type="button"
                            onClick={load}
                            aria-label="Yenile"
                            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-border bg-card text-foreground active:bg-muted"
                        >
                            <RefreshCw className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {loadFailed && (
                    <div role="alert" className="rounded-2xl border-2 border-rb-red bg-rb-red-bg px-4 py-3 text-base font-semibold text-foreground">
                        Siparişler yüklenemedi. İnternet bağlantınızı kontrol edip yenileye basın.
                    </div>
                )}

                {loading ? (
                    <div className="h-80 animate-pulse rounded-[22px] bg-muted" aria-busy="true" />
                ) : !current ? (
                    <EmptyState
                        icon={Bike}
                        title="Üzerinizde sipariş yok"
                        description="Kasiyer size paket sipariş atadığında burada görünür."
                    />
                ) : (
                    <>
                        <NextJobCard order={current} now={now} />

                        {later.length > 0 && (
                            <section aria-label="Sonraki siparişler" className="flex flex-col gap-2">
                                <p className="pt-1 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">Sonra</p>
                                {later.map((order, index) => (
                                    <LaterRow
                                        key={order.id}
                                        order={order}
                                        position={index + 2}
                                        now={now}
                                        onFocus={() => setFocusId(order.id)}
                                    />
                                ))}
                            </section>
                        )}
                    </>
                )}

                {(delivered.length > 0 || (summary?.deliveredTodayCount ?? 0) > 0) && (
                    <section className="mt-3" aria-labelledby="courier-delivered-title">
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                            <h2 id="courier-delivered-title" className="text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                                Bugün teslim ettiklerim · {summary?.deliveredTodayCount ?? delivered.length}
                            </h2>
                            {(summary?.outstandingCard ?? 0) > 0 && (
                                <span className="text-xs font-semibold text-muted-foreground">Kart/IBAN ₺{formatPrice(summary?.outstandingCard ?? 0)}</span>
                            )}
                        </div>
                        {delivered.length > 0 && (
                            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                                {delivered.map(order => (
                                    <li key={order.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-[15px] font-bold text-foreground">#{order.number} · {order.zoneName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {timeOf(order.deliveredAt)} · {doorPaymentLabel(order.collectedMethod)}
                                                {order.settledAt ? ' · kasaya teslim edildi' : ''}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <span className="text-lg font-black tabular-nums text-foreground">₺{formatPrice(order.collectedAmount ?? order.total)}</span>
                                            {canUndo(order, now) && (
                                                <button
                                                    type="button"
                                                    onClick={() => undoDeliver(order)}
                                                    disabled={busyId === order.id}
                                                    className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-foreground bg-background px-3 text-base font-bold text-foreground active:bg-muted disabled:opacity-50"
                                                >
                                                    <Undo2 className="h-5 w-5" aria-hidden="true" />
                                                    Geri al
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}
            </main>

            {current && (
                <ActionBar
                    order={current}
                    ready={ready}
                    now={now}
                    busy={anyBusy}
                    bulkBusy={bulkBusy}
                    onDispatchAll={dispatchAll}
                    onDispatchOne={() => dispatch(current)}
                    onDeliver={() => setDeliverTarget(current)}
                />
            )}

            {deliverTarget && (
                <DeliverSheet
                    order={deliverTarget}
                    busy={busyId === deliverTarget.id}
                    onClose={() => setDeliverTarget(null)}
                    onConfirm={method => deliver(deliverTarget, method)}
                />
            )}
        </div>
    );
}

// ── Sıradaki iş kartı ─────────────────────────────────────────────────────────────────────────

function StatusPill({ order, now }: { order: CourierOrder; now: number }) {
    if (order.canDeliver) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rb-accent-bg px-2.5 py-1 text-xs font-bold text-rb-accent">
                <Bike className="h-3.5 w-3.5" aria-hidden="true" />Yolda{order.dispatchedAt ? ` · ${timeOf(order.dispatchedAt)}` : ''}
            </span>
        );
    }
    if (order.canDispatch) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rb-green-bg px-2.5 py-1 text-xs font-bold text-rb-green">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />Paket hazır
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rb-amber-bg px-2.5 py-1 text-xs font-bold text-rb-amber">
            <ChefHat className="h-3.5 w-3.5" aria-hidden="true" />
            Mutfakta{order.acceptedAt ? ` · ${elapsedText(order.acceptedAt, now)}` : ''}
        </span>
    );
}

function NextJobCard({ order, now }: { order: CourierOrder; now: number }) {
    const cash = order.paymentPreference === DoorPayment.Nakit;
    // Müşteri IBAN'a havale yapar; kurye kapıda para almaz.
    const iban = order.paymentPreference === DoorPayment.Iban;
    const promise = promiseText(order, now);
    const late = (promiseMinutes(order, now) ?? 0) < 0;
    const itemCount = order.lines.reduce((sum, l) => sum + l.quantity, 0);
    const noteCount = order.lines.filter(l => l.note).length + (order.note ? 1 : 0);

    return (
        <article className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_12px_30px_-18px_rgba(0,0,0,.35)]">
            <div className="flex items-center justify-between gap-2 px-4 pt-4">
                <span className="min-w-0 truncate text-sm font-bold text-muted-foreground">#{order.number} · {order.customerName}</span>
                <StatusPill order={order} now={now} />
            </div>

            <div className="px-4 pt-3">
                <p className="text-[30px] font-black leading-[1.05] tracking-tight text-foreground">{order.zoneName}</p>
                <p className="mt-1 text-[17px] leading-snug text-foreground">{order.address}</p>
                {order.addressDirections && (
                    <p className="mt-2 rounded-xl bg-rb-amber-bg px-3 py-2 text-[15px] font-semibold text-foreground">{order.addressDirections}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 p-4">
                <a
                    href={mapsUrl(order.mapsQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-[72px] flex-col items-center justify-center gap-1 rounded-2xl bg-foreground text-[15px] font-bold text-background active:opacity-80"
                >
                    <Navigation className="h-6 w-6" aria-hidden="true" />
                    Yol tarifi
                </a>
                <a
                    href={telUrl(order.customerPhone)}
                    className="flex h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-foreground text-[15px] font-bold text-foreground active:bg-muted"
                >
                    <Phone className="h-6 w-6" aria-hidden="true" />
                    Ara
                </a>
            </div>

            <div className={cn(
                'mx-4 mb-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3',
                cash ? 'bg-rb-green-bg' : iban ? 'bg-rb-purple-bg' : 'bg-rb-accent-bg'
            )}>
                <div className="min-w-0">
                    <p className={cn('flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider', cash ? 'text-rb-green' : iban ? 'text-rb-purple' : 'text-rb-accent')}>
                        {cash ? <Banknote className="h-4 w-4" aria-hidden="true" /> : iban ? <Landmark className="h-4 w-4" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
                        {cash ? 'Kapıda nakit al' : iban ? 'IBAN (havale) · para almayın' : 'Kapıda kart (POS)'}
                    </p>
                    {promise && <p className={cn('text-[13px]', late ? 'font-bold text-rb-red' : 'text-muted-foreground')}>{promise}</p>}
                </div>
                <p className="shrink-0 text-[30px] font-black tabular-nums text-foreground">₺{formatPrice(order.total)}</p>
            </div>

            <details className="group border-t border-border">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                    <span>{itemCount} ürün{noteCount > 0 ? ` · ${noteCount} not` : ''}</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ul className="px-4 pb-3">
                    {order.lines.map((line, index) => (
                        <li key={index} className="py-1 text-base text-foreground">
                            <span className="font-bold tabular-nums">{line.quantity}×</span> {line.name}
                            {line.selections.length > 0 && <span className="text-muted-foreground"> ({line.selections.join(', ')})</span>}
                            {line.note && <span className="block pl-6 text-sm font-semibold text-rb-orange">Not: {line.note}</span>}
                        </li>
                    ))}
                    {order.note && <li className="pt-1 text-base font-semibold text-rb-orange">Sipariş notu: {order.note}</li>}
                </ul>
            </details>
        </article>
    );
}

function LaterRow({ order, position, now, onFocus }: { order: CourierOrder; position: number; now: number; onFocus: () => void }) {
    const state = order.canDeliver
        ? 'Yolda'
        : order.canDispatch
            ? 'Hazır'
            : `Mutfakta${order.acceptedAt ? ` · ${elapsedText(order.acceptedAt, now)}` : ''}`;
    return (
        <button
            type="button"
            onClick={onFocus}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left active:bg-muted"
            aria-label={`#${order.number} ${order.zoneName} siparişini öne al`}
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black text-foreground">{position}</span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-foreground">{order.zoneName} · #{order.number}</span>
                <span className="block truncate text-sm text-muted-foreground">{doorPaymentLabel(order.paymentPreference)} · {state}</span>
            </span>
            <span className="shrink-0 text-lg font-black tabular-nums text-foreground">₺{formatPrice(order.total)}</span>
        </button>
    );
}

// ── Alttaki tek eylem çubuğu ──────────────────────────────────────────────────────────────────

interface ActionBarProps {
    order: CourierOrder;
    ready: CourierOrder[];
    now: number;
    busy: boolean;
    bulkBusy: boolean;
    onDispatchAll: () => void;
    onDispatchOne: () => void;
    onDeliver: () => void;
}

// Ana düğme her zaman aynı yerde: sıradaki paket yoldaysa "Teslim ettim", hazırsa "Yola çıktım" (hazır paketlerin
// hepsiyle birlikte), mutfaktaysa bekleme durumu.
function ActionBar({ order, ready, now, busy, bulkBusy, onDispatchAll, onDispatchOne, onDeliver }: ActionBarProps) {
    const base = 'flex h-[68px] w-full items-center justify-center gap-3 rounded-[20px] text-[21px] font-black active:opacity-80 disabled:opacity-50';

    return (
        <footer className="sticky bottom-0 border-t border-border bg-card px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.10)] sm:px-4">
            <div className="mx-auto w-full max-w-xl">
                {order.canDeliver ? (
                    <>
                        <button type="button" onClick={onDeliver} disabled={busy}
                            className={cn(base, 'bg-rb-green text-rb-green-foreground shadow-[0_10px_24px_-10px_rgba(31,138,82,.7)]')}>
                            <Check className="h-7 w-7" aria-hidden="true" />
                            Teslim ettim · #{order.number}
                        </button>
                        <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">Ödemeyi bir sonraki ekranda seçersiniz.</p>
                    </>
                ) : order.canDispatch ? (
                    <>
                        <button type="button" onClick={ready.length > 1 ? onDispatchAll : onDispatchOne} disabled={busy}
                            className={cn(base, 'bg-rb-accent text-rb-accent-foreground shadow-[0_10px_24px_-10px_rgba(43,127,255,.7)]')}>
                            <Bike className="h-7 w-7" aria-hidden="true" />
                            {bulkBusy || busy ? 'Kaydediliyor…' : ready.length > 1 ? `Hepsiyle yola çık (${ready.length})` : 'Yola çıktım'}
                        </button>
                        <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">
                            {ready.length > 1
                                ? <>Hazır paketlerin hepsi birlikte yola çıkar: {ready.map(o => `#${o.number}`).join(', ')}</>
                                : `#${order.number} yola çıkar`}
                        </p>
                        {ready.length > 1 && (
                            <button type="button" onClick={onDispatchOne} disabled={busy}
                                className="mx-auto mt-1 flex min-h-11 items-center px-3 text-sm font-semibold text-rb-accent underline-offset-2 active:underline disabled:opacity-50">
                                Yalnızca #{order.number} ile çık
                            </button>
                        )}
                    </>
                ) : (
                    <div className="flex min-h-[68px] flex-col items-center justify-center rounded-[20px] bg-muted px-3 py-2 text-center text-foreground">
                        <p className="flex items-center gap-2 text-lg font-bold">
                            <ChefHat className="h-5 w-5 shrink-0" aria-hidden="true" />
                            {order.acceptedAt ? `Mutfakta · ${elapsedText(order.acceptedAt, now)}` : 'Mutfakta hazırlanıyor'}
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground">
                            {order.estimatedDeliveryAt ? `Söz verilen teslim ${timeOf(order.estimatedDeliveryAt)} · ` : ''}
                            hazır olunca yola çıkabilirsiniz
                        </p>
                    </div>
                )}
            </div>
        </footer>
    );
}

// ── Teslim: ödeme türü ve para üstü ───────────────────────────────────────────────────────────

/** Müşterinin verebileceği yuvarlak tutarlar: tutarın üstündeki ilk 50'lik, 100'lük, 500'lük ve 1000'lik. */
function cashGivenOptions(total: number): number[] {
    const values = [50, 100, 500, 1000]
        .map(step => Math.ceil(total / step) * step)
        .filter(v => v > total);
    return [...new Set(values)].slice(0, 3);
}

interface DeliverSheetProps {
    order: CourierOrder;
    busy: boolean;
    onClose: () => void;
    onConfirm: (method: DoorPaymentMethod) => void;
}

// Teslim penceresi (alttan açılır): ödeme türü müşterinin tercihiyle seçili gelir, kurye kapıda değişeni seçebilir.
// Nakitte "Müşteri ne verdi?" ile para üstü hesaplanır (yalnızca kuryeye yardım; sunucuya gitmez). Tercihten farklı
// ödeme türü seçilirse ayrıca uyarılır. Kayıttan sonra 2 dk içinde "Geri al" çıkar.
function DeliverSheet({ order, busy, onClose, onConfirm }: DeliverSheetProps) {
    const [method, setMethod] = useState<DoorPaymentMethod>(order.paymentPreference);
    /** Müşterinin verdiği nakit; null: seçilmedi, "Tam" = tutar. */
    const [given, setGiven] = useState<number | null>(null);
    const [custom, setCustom] = useState('');
    const cash = method === DoorPayment.Nakit;
    const options = cashGivenOptions(order.total);
    const customValue = custom.trim() === '' ? null : Number(custom.replace(',', '.'));
    const paid = customValue !== null && Number.isFinite(customValue) ? customValue : given;
    const change = paid !== null ? Math.round((paid - order.total) * 100) / 100 : null;
    const differs = method !== order.paymentPreference;
    // IBAN yalnızca müşteri IBAN'ı seçtiyse kaydedilebilir (sunucu da öyle ister).
    const options3 = order.paymentPreference === DoorPayment.Iban;
    const methodOptions = [
        [DoorPayment.Nakit, 'Nakit', Banknote],
        [DoorPayment.Kart, 'Kart', CreditCard],
        ...(options3 ? [[DoorPayment.Iban, 'IBAN', Landmark] as const] : []),
    ] as const;

    const chip = (value: number, label: string) => {
        const selected = custom.trim() === '' && given === value;
        return (
            <button
                key={label}
                type="button"
                aria-pressed={selected}
                onClick={() => { setGiven(value); setCustom(''); }}
                className={cn(
                    'flex h-12 items-center justify-center rounded-xl border text-[15px] font-bold tabular-nums',
                    selected ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground active:bg-muted'
                )}
            >
                {label}
            </button>
        );
    };

    return (
        <Modal onClose={onClose} closeOnOverlay={!busy} overlayClassName="z-80 items-end sm:items-center bg-black/55 sm:p-3">
            <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-border bg-card shadow-2xl sm:rounded-[28px]">
                <div className="mx-auto mt-3 mb-3 h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
                <div className="flex shrink-0 items-baseline justify-between gap-3 px-4">
                    <ModalTitle className="text-lg font-black text-foreground">#{order.number} teslim</ModalTitle>
                    <p className="text-sm text-muted-foreground">Tercih: {methodWord(order.paymentPreference)}</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-1">
                <p className="mt-1 text-[40px] font-black leading-none tabular-nums text-foreground">₺{formatPrice(order.total)}</p>

                <div className={cn('mt-3 grid gap-2', options3 ? 'grid-cols-3' : 'grid-cols-2')} role="radiogroup" aria-label="Ödeme türü">
                    {methodOptions.map(([value, label, Icon]) => {
                        const selected = method === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setMethod(value)}
                                disabled={busy}
                                className={cn(
                                    'flex h-14 items-center justify-center gap-2 rounded-2xl text-base font-black',
                                    selected
                                        ? value === DoorPayment.Nakit
                                            ? 'bg-rb-green text-rb-green-foreground ring-4 ring-rb-green/25'
                                            : value === DoorPayment.Iban
                                                ? 'bg-rb-purple text-white ring-4 ring-rb-purple/25'
                                                : 'bg-rb-accent text-rb-accent-foreground ring-4 ring-rb-accent/25'
                                        : 'border-2 border-border text-foreground active:bg-muted'
                                )}
                            >
                                <Icon className="h-5 w-5" aria-hidden="true" />{label}
                            </button>
                        );
                    })}
                </div>

                {differs && (
                    <p role="alert" className="mt-3 flex items-start gap-2 rounded-2xl bg-rb-amber-bg px-4 py-3 text-[15px] font-semibold text-foreground">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rb-amber" aria-hidden="true" />
                        Müşteri {order.paymentPreference === DoorPayment.Iban ? 'IBAN ile ödeyeceğini' : `kapıda ${methodWord(order.paymentPreference)}`} demişti. {doorPaymentLabel(method)} olarak kaydedilecek.
                    </p>
                )}

                {method === DoorPayment.Iban && (
                    <p className="mt-3 rounded-2xl bg-rb-purple-bg px-4 py-3 text-[15px] font-semibold text-foreground">
                        Müşteri havale/EFT ile öder; kapıda para almayın. Paranın hesaba geçtiğini kasa kontrol eder.
                    </p>
                )}

                {cash && (
                    <>
                        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Müşteri ne verdi?</p>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                            {chip(order.total, 'Tam')}
                            {options.map(v => chip(v, `₺${formatPrice(v)}`))}
                        </div>
                        <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            value={custom}
                            onChange={e => setCustom(e.target.value)}
                            placeholder="Başka tutar"
                            aria-label="Müşterinin verdiği tutar"
                            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-rb-accent"
                        />
                        {change !== null && (
                            change >= 0 ? (
                                <div className="mt-3 flex items-center justify-between rounded-2xl bg-rb-amber-bg px-4 py-3">
                                    <span className="text-[15px] font-semibold text-foreground">{change === 0 ? 'Para üstü yok' : 'Para üstü verin'}</span>
                                    <span className="text-2xl font-black tabular-nums text-foreground">₺{formatPrice(change)}</span>
                                </div>
                            ) : (
                                <div className="mt-3 flex items-center justify-between rounded-2xl bg-rb-red-bg px-4 py-3">
                                    <span className="text-[15px] font-semibold text-rb-red">Eksik ödeme</span>
                                    <span className="text-2xl font-black tabular-nums text-rb-red">₺{formatPrice(-change)}</span>
                                </div>
                            )
                        )}
                    </>
                )}
                </div>

                <div className="shrink-0 border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={() => onConfirm(method)}
                    disabled={busy}
                    className={cn(
                        'mt-4 flex h-16 w-full items-center justify-center rounded-[18px] text-xl font-black active:opacity-80 disabled:opacity-50',
                        cash ? 'bg-rb-green text-rb-green-foreground' : method === DoorPayment.Iban ? 'bg-rb-purple text-white' : 'bg-rb-accent text-rb-accent-foreground'
                    )}
                >
                    {busy ? 'Kaydediliyor…' : `Teslim ettim · ${methodWord(method)} ₺${formatPrice(order.total)}`}
                </button>
                <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Yanlış seçerseniz 2 dk içinde “Geri al” çıkar.</p>
                    <button type="button" onClick={onClose} disabled={busy}
                        className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-muted-foreground active:bg-muted">
                        Vazgeç
                    </button>
                </div>
                </div>
            </div>
        </Modal>
    );
}
