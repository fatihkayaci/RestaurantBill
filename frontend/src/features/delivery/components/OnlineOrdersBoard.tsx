import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Banknote, Bike, CreditCard, RefreshCw, Timer } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CourierCashPanel from '@/pages/cashier/components/CourierCashPanel';
import type { CourierCashSummary } from '@/features/courier/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatElapsed } from '@/lib/format';
import { cn } from '@/lib/utils';
import { deliveryService, type OnlineOrderingStatus } from '../api/deliveryService';
import {
    BOARD_COLUMNS, boardColumnOf, countdownText, mergeBoardOrders, orderTitle, type BoardColumnKey,
} from '../deliveryStatus';
import { markOnlineOrderSeen, subscribeOnlineOrders } from '../onlineOrdersHub';
import { DeliveryStatus, DoorPayment, type DeliveryOrder } from '../types';
import DeliveryOrderDetail from './DeliveryOrderDetail';

interface Props {
    /** Engelleme (telefon kara listesi) yalnızca Owner/Admin. */
    canBlockPhone: boolean;
    /** Kök kutunun iç boşluğu; yönetici sayfası kendi boşluğunu verdiği için "" geçer. */
    className?: string;
}

type View = 'orders' | 'couriers';

// Online paket siparişler panosu: kasiyer ekranında sekme, yöneticide /admin/online-orders sayfası. Sütunlar Yeni /
// Hazırlanıyor / Hazır / Yolda / Teslim edildi (bugün); karta dokununca detay ve işlemler açılır. Dar ekranda sütunlar
// sekme olur. "Kurye kasası" görünümü kuryelerdeki tahsilatın "Teslim al"ıdır. Canlı olaylar uyarılarla aynı bağlantıdan.
export default function OnlineOrdersBoard({ canBlockPhone, className }: Props) {
    const [params, setParams] = useSearchParams();
    const [orders, setOrders] = useState<DeliveryOrder[] | null>(null);
    const [couriers, setCouriers] = useState<CourierCashSummary[]>([]);
    const [status, setStatus] = useState<OnlineOrderingStatus | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [view, setView] = useState<View>('orders');
    const [mobileColumn, setMobileColumn] = useState<BoardColumnKey>('new');
    const [now, setNow] = useState(() => Date.now());
    const [pausing, setPausing] = useState(false);
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
        // Yeni sipariş varken geri sayım saniyede bir, yoksa yaş bilgisi yarım dakikada bir yenilenir.
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
        // Teslim edilenler en yeni üstte; diğerleri en eski üstte (sırası gelen).
        grouped.delivered.reverse();
        return grouped;
    }, [orders]);

    const selected = selectedId ? (orders ?? []).find(o => o.id === selectedId) ?? null : null;

    const openOrder = (id: string) => {
        setParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('siparis', id);
            return next;
        });
    };
    const closeOrder = () => {
        setParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('siparis');
            return next;
        }, { replace: true });
    };

    const togglePause = async (paused: boolean) => {
        setPausing(true);
        try {
            const result = await deliveryService.setPaused(paused);
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

    return (
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4', className ?? 'p-4 sm:p-6')}>
            {/* Araç çubuğu */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl border border-border bg-card p-1" role="tablist" aria-label="Görünüm">
                    {([['orders', 'Siparişler'], ['couriers', 'Kurye kasası']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={view === key}
                            onClick={() => setView(key)}
                            className={cn(
                                'min-h-10 rounded-lg px-3.5 text-sm font-semibold transition-colors',
                                view === key ? 'bg-rb-gold text-rb-gold-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => { load(); loadStatus(); }}
                    aria-label="Yenile"
                    title="Yenile"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>

                {status && (
                    <div className={cn(
                        'ml-auto flex items-center gap-2 rounded-xl border px-3 py-2',
                        status.paused ? 'border-rb-red/40 bg-rb-red-bg' : 'border-border bg-card'
                    )}>
                        {status.enabled ? (
                            <Switch
                                checked={status.paused}
                                disabled={pausing}
                                onCheckedChange={togglePause}
                                onClassName="bg-rb-red"
                                aria-label="Online siparişe kapalı"
                                label={<span className="text-sm font-semibold text-foreground">Online siparişe kapalı</span>}
                            />
                        ) : (
                            <span className="text-sm text-muted-foreground">Online sipariş ayarlarda kapalı</span>
                        )}
                    </div>
                )}
            </div>

            {view === 'couriers' ? (
                <CourierCashPanel />
            ) : orders === null ? (
                loadFailed ? (
                    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rb-red/30 bg-rb-red-bg px-4 py-3">
                        <p className="text-sm text-foreground">Online siparişler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
                        <button type="button" onClick={load} className="h-11 rounded-lg border border-border bg-card px-4 text-sm font-semibold">Tekrar dene</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5" aria-busy="true">
                        {[...Array(5)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}
                    </div>
                )
            ) : (
                <>
                    {/* Dar ekran: sütun seçici */}
                    <div className="flex gap-2 overflow-x-auto lg:hidden" role="tablist" aria-label="Sütunlar">
                        {BOARD_COLUMNS.map(col => (
                            <button
                                key={col.key}
                                type="button"
                                role="tab"
                                aria-selected={mobileColumn === col.key}
                                onClick={() => setMobileColumn(col.key)}
                                className={cn(
                                    'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold',
                                    mobileColumn === col.key ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border bg-card text-foreground'
                                )}
                            >
                                {col.label}
                                <span className={cn(
                                    'rounded-full px-1.5 text-xs tabular-nums',
                                    col.key === 'new' && columns.new.length > 0 && mobileColumn !== col.key ? 'bg-rb-accent text-rb-accent-foreground' : 'bg-black/10'
                                )}>{columns[col.key].length}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-5">
                        {BOARD_COLUMNS.map(col => (
                            <section
                                key={col.key}
                                aria-label={col.label}
                                className={cn('flex min-h-0 flex-col gap-3 lg:overflow-y-auto', mobileColumn !== col.key && 'hidden lg:flex')}
                            >
                                <h2 className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:flex">
                                    {col.label}
                                    <span className={cn(
                                        'rounded px-1.5 py-0.5 text-xs font-bold',
                                        col.key === 'new' && columns.new.length > 0 ? 'bg-rb-accent text-rb-accent-foreground' : 'bg-muted text-muted-foreground'
                                    )}>{columns[col.key].length}</span>
                                </h2>
                                {columns[col.key].length === 0 ? (
                                    <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                                        {col.key === 'new' ? 'Yeni sipariş yok.' : col.key === 'delivered' ? 'Bugün teslim edilen yok.' : 'Sipariş yok.'}
                                    </p>
                                ) : columns[col.key].map(order => (
                                    <OrderCard key={order.id} order={order} now={now} onOpen={() => openOrder(order.id)} />
                                ))}
                            </section>
                        ))}
                    </div>
                </>
            )}

            {selected && (
                <DeliveryOrderDetail
                    order={selected}
                    couriers={couriers}
                    canBlockPhone={canBlockPhone}
                    now={now}
                    onClose={closeOrder}
                    onChanged={load}
                />
            )}
        </div>
    );
}

function OrderCard({ order, now, onOpen }: { order: DeliveryOrder; now: number; onOpen: () => void }) {
    const isNew = order.status === DeliveryStatus.Received;
    const cash = order.paymentPreference === DoorPayment.Nakit;
    const items = order.lines.reduce((sum, l) => sum + l.quantity, 0);
    const autoRejectSoon = isNew && order.autoRejectAt && new Date(order.autoRejectAt).getTime() - now < 2 * 60_000;

    return (
        <button
            type="button"
            onClick={onOpen}
            className={cn(
                'flex w-full flex-col gap-2 rounded-2xl border bg-card p-3.5 text-left transition-shadow hover:shadow-md',
                isNew ? 'border-rb-accent/60 ring-1 ring-rb-accent/30' : 'border-border'
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate font-serif text-lg font-bold text-foreground">{orderTitle(order)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatElapsed(order.createdAt, now)}</span>
            </div>

            {isNew && order.autoRejectAt && (
                <span className={cn(
                    'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                    autoRejectSoon ? 'bg-rb-red text-rb-red-foreground' : 'bg-rb-amber-bg text-rb-amber'
                )}>
                    <Timer className="h-3 w-3" aria-hidden="true" />
                    Otomatik ret {countdownText(order.autoRejectAt, now)}
                </span>
            )}

            <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-xl font-bold tabular-nums text-foreground">₺{formatAmount(order.total)}</span>
                <span className={cn(
                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold',
                    cash ? 'bg-rb-green-bg text-rb-green' : 'bg-rb-accent-bg text-rb-accent'
                )}>
                    {cash ? <Banknote className="h-3 w-3" aria-hidden="true" /> : <CreditCard className="h-3 w-3" aria-hidden="true" />}
                    {cash ? 'NAKİT' : 'KART'}
                </span>
            </div>

            <ul className="text-xs text-muted-foreground">
                {order.lines.slice(0, 3).map((line, i) => (
                    <li key={i} className="truncate">{line.quantity}× {line.name}</li>
                ))}
                {order.lines.length > 3 && <li>+{order.lines.length - 3} satır daha · {items} ürün</li>}
            </ul>

            {(order.courierName || order.status >= DeliveryStatus.Ready) && (
                <p className={cn('flex items-center gap-1 text-xs font-semibold', order.courierName ? 'text-foreground' : 'text-rb-amber')}>
                    <Bike className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    {order.courierName ?? 'Kurye atanmadı'}
                    {order.status === DeliveryStatus.Delivered && (order.settledAt ? ' · kasaya alındı' : ' · teslim alınmadı')}
                </p>
            )}
        </button>
    );
}
