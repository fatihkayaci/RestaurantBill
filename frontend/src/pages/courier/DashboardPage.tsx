import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Bike, CreditCard, MapPin, Navigation, Phone, RefreshCw, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal, ModalTitle } from '@/components/ui/modal';
import { courierService } from '@/features/courier/api/courierService';
import {
    DoorPayment, mapsUrl, telUrl,
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

function payLabel(method: DoorPaymentMethod): string {
    return method === DoorPayment.Nakit ? 'Kapıda nakit' : 'Kapıda kart';
}

const STATUS_CLASS: Record<number, string> = {
    [Status.Accepted]: 'bg-muted text-foreground',
    [Status.Preparing]: 'bg-rb-amber text-rb-amber-foreground',
    [Status.Ready]: 'bg-rb-green text-rb-green-foreground',
    [Status.OnTheWay]: 'bg-rb-accent text-rb-accent-foreground',
    [Status.Delivered]: 'bg-muted text-foreground',
};

// Kurye ekranı: telefonda, güneş altında okunacak büyük kartlar. Kurye yalnızca kendisine atanmış siparişleri görür.
export default function CourierDashboardPage() {
    const [orders, setOrders] = useState<CourierOrder[]>([]);
    const [summary, setSummary] = useState<CourierDaySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [deliverTarget, setDeliverTarget] = useState<CourierOrder | null>(null);
    const loadSeq = useRef(0);

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

    const deliver = async (order: CourierOrder, method: DoorPaymentMethod) => {
        setBusyId(order.id);
        try {
            await courierService.deliver(order.id, method);
            setDeliverTarget(null);
            toast.success(`PAKET #${order.number} teslim edildi · ${method === DoorPayment.Nakit ? 'nakit' : 'kart'} ₺${formatPrice(order.total)}`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Teslim kaydedilemedi. Tekrar deneyin.'));
        } finally {
            setBusyId(null);
            load();
        }
    };

    const active = orders.filter(o => o.status !== Status.Delivered);
    const delivered = orders.filter(o => o.status === Status.Delivered);

    return (
        <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
            <main className="mx-auto w-full max-w-xl flex-1 px-3 pt-4 pb-6 sm:px-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h1 className="text-xl font-bold text-foreground">Siparişlerim</h1>
                    <button
                        type="button"
                        onClick={load}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-border bg-card px-4 text-base font-semibold text-foreground active:bg-muted"
                    >
                        <RefreshCw className="h-5 w-5" aria-hidden="true" />
                        Yenile
                    </button>
                </div>

                {loadFailed && (
                    <div role="alert" className="mb-3 rounded-xl border-2 border-rb-red bg-rb-red-bg px-4 py-3 text-base font-semibold text-foreground">
                        Siparişler yüklenemedi. İnternet bağlantınızı kontrol edip “Yenile”ye basın.
                    </div>
                )}

                {loading ? (
                    <p className="py-10 text-center text-lg text-muted-foreground">Yükleniyor…</p>
                ) : active.length === 0 ? (
                    <EmptyState
                        icon={Bike}
                        title="Üzerinizde sipariş yok"
                        description="Kasiyer size paket sipariş atadığında burada görünür."
                    />
                ) : (
                    <ul className="flex flex-col gap-4">
                        {active.map(order => (
                            <li key={order.id}>
                                <CourierOrderCard
                                    order={order}
                                    busy={busyId === order.id}
                                    onDispatch={() => dispatch(order)}
                                    onDeliver={() => setDeliverTarget(order)}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                {delivered.length > 0 && (
                    <section className="mt-6">
                        <h2 className="mb-2 text-sm font-bold tracking-widest text-muted-foreground uppercase">Bugün teslim ettiklerim</h2>
                        <ul className="divide-y divide-border rounded-2xl border-2 border-border bg-card">
                            {delivered.map(order => (
                                <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-base font-bold text-foreground">PAKET #{order.number} · {order.zoneName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {timeOf(order.deliveredAt)} · {order.collectedMethod === DoorPayment.Nakit ? 'Nakit' : 'Kart'}
                                            {order.settledAt ? ' · kasaya teslim edildi' : ''}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">₺{formatPrice(order.collectedAmount ?? order.total)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>

            {/* "Bugün": teslim sayısı ve kasaya teslim edilecek tahsilat. */}
            <footer className="sticky bottom-0 border-t-2 border-border bg-card px-3 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] sm:px-4">
                <div className="mx-auto grid w-full max-w-xl grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-foreground">{summary?.deliveredTodayCount ?? 0}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Bugün teslim</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-rb-green">₺{formatPrice(summary?.outstandingCash ?? 0)}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Kasaya verilecek nakit</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold tabular-nums text-foreground">₺{formatPrice(summary?.outstandingCard ?? 0)}</p>
                        <p className="text-xs font-semibold text-muted-foreground">Kartla alınan</p>
                    </div>
                </div>
            </footer>

            {deliverTarget && (
                <DeliverDialog
                    order={deliverTarget}
                    busy={busyId === deliverTarget.id}
                    onClose={() => setDeliverTarget(null)}
                    onPick={method => deliver(deliverTarget, method)}
                />
            )}
        </div>
    );
}

interface CardProps {
    order: CourierOrder;
    busy: boolean;
    onDispatch: () => void;
    onDeliver: () => void;
}

function CourierOrderCard({ order, busy, onDispatch, onDeliver }: CardProps) {
    const cash = order.paymentPreference === DoorPayment.Nakit;

    return (
        <article className="overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b-2 border-border px-4 py-3">
                <p className="text-2xl font-black text-foreground">PAKET #{order.number}</p>
                <span className={cn('rounded-lg px-3 py-1 text-sm font-bold', STATUS_CLASS[order.status] ?? 'bg-muted text-foreground')}>
                    {order.statusLabel}
                </span>
            </header>

            <div className="flex flex-col gap-3 px-4 py-4">
                <div>
                    <p className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <MapPin className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {order.zoneName}
                    </p>
                    <p className="mt-1 text-lg leading-snug text-foreground">{order.address}</p>
                    {order.addressDirections && (
                        <p className="mt-1 text-base font-semibold text-foreground">Tarif: {order.addressDirections}</p>
                    )}
                    <p className="mt-1 text-base text-muted-foreground">{order.customerName}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <a
                        href={mapsUrl(order.mapsQuery)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background text-base font-bold text-foreground active:bg-muted"
                    >
                        <Navigation className="h-5 w-5" aria-hidden="true" />
                        Yol tarifi
                    </a>
                    <a
                        href={telUrl(order.customerPhone)}
                        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-background text-base font-bold text-foreground active:bg-muted"
                    >
                        <Phone className="h-5 w-5" aria-hidden="true" />
                        Ara
                    </a>
                </div>

                <ul className="rounded-xl bg-muted px-3 py-2">
                    {order.lines.map((line, index) => (
                        <li key={index} className="py-1 text-base text-foreground">
                            <span className="font-bold tabular-nums">{line.quantity}×</span> {line.name}
                            {line.selections.length > 0 && <span className="text-muted-foreground"> ({line.selections.join(', ')})</span>}
                            {line.note && <span className="block pl-6 text-sm font-semibold text-rb-orange">Not: {line.note}</span>}
                        </li>
                    ))}
                </ul>
                {order.note && <p className="text-base font-semibold text-rb-orange">Sipariş notu: {order.note}</p>}

                <div className="flex items-center justify-between gap-3">
                    <span className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base font-bold',
                        cash ? 'bg-rb-green text-rb-green-foreground' : 'bg-rb-accent text-rb-accent-foreground',
                    )}>
                        {cash ? <Banknote className="h-5 w-5" aria-hidden="true" /> : <CreditCard className="h-5 w-5" aria-hidden="true" />}
                        {payLabel(order.paymentPreference)}
                    </span>
                    <span className="text-3xl font-black tabular-nums text-foreground">₺{formatPrice(order.total)}</span>
                </div>
                {order.estimatedDeliveryAt && (
                    <p className="text-sm text-muted-foreground">Müşteriye söylenen saat: {timeOf(order.estimatedDeliveryAt)}</p>
                )}
            </div>

            <div className="border-t-2 border-border p-3">
                {order.canDispatch ? (
                    <button
                        type="button"
                        onClick={onDispatch}
                        disabled={busy}
                        className="min-h-16 w-full rounded-xl bg-rb-accent text-xl font-black text-rb-accent-foreground active:opacity-80 disabled:opacity-50"
                    >
                        {busy ? 'Kaydediliyor…' : 'Yola çıktım'}
                    </button>
                ) : order.canDeliver ? (
                    <button
                        type="button"
                        onClick={onDeliver}
                        disabled={busy}
                        className="min-h-16 w-full rounded-xl bg-rb-green text-xl font-black text-rb-green-foreground active:opacity-80 disabled:opacity-50"
                    >
                        Teslim ettim
                    </button>
                ) : (
                    <p className="flex min-h-16 items-center justify-center rounded-xl bg-muted text-lg font-bold text-foreground">
                        Mutfakta hazırlanıyor, hazır olunca yola çıkabilirsiniz
                    </p>
                )}
            </div>
        </article>
    );
}

interface DeliverDialogProps {
    order: CourierOrder;
    busy: boolean;
    onClose: () => void;
    onPick: (method: DoorPaymentMethod) => void;
}

// Teslimde ödeme nasıl alındı: müşterinin tercihi öne çıkar ama kurye kapıda değişeni seçebilir.
function DeliverDialog({ order, busy, onClose, onPick }: DeliverDialogProps) {
    const options: { method: DoorPaymentMethod; label: string; icon: typeof Banknote; className: string }[] = [
        { method: DoorPayment.Nakit, label: 'Nakit aldım', icon: Banknote, className: 'bg-rb-green text-rb-green-foreground' },
        { method: DoorPayment.Kart, label: 'Kartla ödendi', icon: CreditCard, className: 'bg-rb-accent text-rb-accent-foreground' },
    ];

    return (
        <Modal onClose={onClose} closeOnOverlay={!busy} overlayClassName="z-80 items-end sm:items-center bg-black/70 p-3">
            <div className="w-full max-w-md rounded-2xl border-2 border-border bg-card p-5 shadow-2xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <ModalTitle className="text-2xl font-black text-foreground">PAKET #{order.number}</ModalTitle>
                        <p className="mt-1 text-lg text-foreground">
                            Tahsil edilecek: <span className="font-black tabular-nums">₺{formatPrice(order.total)}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">Müşterinin tercihi: {payLabel(order.paymentPreference).toLowerCase()}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Kapat"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border text-foreground active:bg-muted"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {options.map(({ method, label, icon: Icon, className }) => (
                        <button
                            key={method}
                            type="button"
                            disabled={busy}
                            onClick={() => onPick(method)}
                            className={cn(
                                'inline-flex min-h-18 items-center justify-center gap-3 rounded-xl text-xl font-black active:opacity-80 disabled:opacity-50',
                                className,
                                method === order.paymentPreference && 'ring-4 ring-foreground/40',
                            )}
                        >
                            <Icon className="h-7 w-7" aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
