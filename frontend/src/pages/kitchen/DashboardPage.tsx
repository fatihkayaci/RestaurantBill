import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '@/features/orders/types';
import { orderService } from '@/features/orders/api/orderService';
import { categoryService } from '@/features/categories/api/categoryService';
import HeaderStatCounter from '@/components/layout/HeaderStatCounter';
import { createHubConnection } from '@/lib/signalrConnection';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiError';

const OrderStatus = {
    Ready: 4,
} as const;

const itemStatusMap: Record<number, { from: number; to: number }> = {
    [OrderStatus.Ready]: { from: 1, to: 3 },
};

interface OrderGroup {
    order: Order;
    items: Order['orderItems'];
}

const URGENT_THRESHOLD_MINUTES = 30;

function formatElapsed(createdAt: string, now: number): string {
    const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}s ${remainingMinutes}dk` : `${remainingMinutes}dk`;
}

/* ── Tek kart bileşeni ── */
function KitchenCard({
    group,
    now,
    onItemUpdate,
    onReady,
}: {
    group: OrderGroup;
    now: number;
    onItemUpdate: (orderId: number, itemId: number, newStatus: number) => void;
    onReady: (group: OrderGroup) => void;
}) {
    const { order, items } = group;

    const elapsedMinutes = Math.max(0, Math.floor((now - new Date(order.createdAt).getTime()) / 60000));
    const isUrgent = elapsedMinutes >= URGENT_THRESHOLD_MINUTES;

    return (
        <div className={`bg-card border rounded-2xl overflow-hidden ${isUrgent ? 'border-rb-amber/60' : ''}`}>
            {/* Kart başlığı */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                <div>
                    <p className="font-serif font-bold text-2xl text-foreground leading-none">
                        {order.tableName}
                    </p>
                    {order.createdByUserName && (
                        <p className="text-xs text-muted-foreground mt-1">{order.createdByUserName}</p>
                    )}
                </div>
                <span className={isUrgent
                    ? 'text-sm font-bold px-2 py-0.5 rounded-md bg-rb-amber text-rb-amber-foreground'
                    : 'text-sm text-muted-foreground'
                }>
                    {formatElapsed(order.createdAt, now)}
                </span>
            </div>

            {/* Sipariş notu */}
            {order.note && (
                <div className="mx-4 mb-3 rounded-lg bg-rb-amber-bg border border-rb-amber/30 text-foreground text-sm px-3 py-2">
                    <span className="font-bold">Not: </span>{order.note}
                </div>
            )}

            {/* Ürün listesi */}
            <div className="px-4 pb-3 space-y-0 divide-y divide-border">
                {items.map(item => (
                    <div key={item.id} className="py-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="min-w-9 text-xl font-bold tabular-nums text-foreground">{item.quantity}×</span>
                                <span className="text-lg font-medium text-foreground truncate">{item.productName}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onItemUpdate(order.id, item.id, 3)}
                                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border border-rb-green/40 transition-colors text-rb-green hover:bg-rb-green-bg"
                                title="Hazır işaretle"
                                aria-label={`${item.productName} hazır`}
                            >
                                <Check className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
                            </button>
                        </div>
                        {item.note && (
                            <p className="mt-1 rounded-md bg-rb-amber-bg border border-rb-amber/30 px-2 py-1 text-sm text-foreground"><span className="font-bold">Not: </span>{item.note}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Bulk aksiyon butonu */}
            <div className="px-4 pb-4">
                <button
                    onClick={() => onReady(group)}
                    className="flex w-full h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors bg-rb-green text-rb-green-foreground hover:opacity-90"
                >
                    <Check className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
                    Tümü Hazır
                </button>
            </div>
        </div>
    );
}

/* ── Column başlığı ── */
function ColumnHeader({ dot, text, bg, label, count }: { dot: string; text: string; bg: string; label: string; count: number }) {
    return (
        <div className={`sticky top-0 z-10 flex items-center gap-2 px-5 py-3 backdrop-blur-sm border-b mb-0 ${bg}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <span className={`text-xs font-bold tracking-widest uppercase ${text}`}>{label}</span>
            <span className={`ml-auto text-xs font-bold ${text}`}>{count}</span>
        </div>
    );
}

export default function KitchenDashboardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [now, setNow] = useState(() => Date.now());
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categoryNames, setCategoryNames] = useState<string[]>([]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const allPendingGroups: OrderGroup[] = orders
        .map(order => ({ order, items: order.orderItems.filter(i => i.status === 1) }))
        .filter(g => g.items.length > 0);

    const categoryCounts = new Map<string, number>();
    allPendingGroups.forEach(g => g.items.forEach(i => {
        const name = i.categoryName || 'Diğer';
        categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + i.quantity);
    }));
    const categoryTabs = Array.from(new Set([...categoryNames, ...categoryCounts.keys()]))
        .sort((a, b) => a.localeCompare(b, 'tr'));

    const pendingGroups: OrderGroup[] = selectedCategory === null
        ? allPendingGroups
        : allPendingGroups
            .map(g => ({ order: g.order, items: g.items.filter(i => (i.categoryName || 'Diğer') === selectedCategory) }))
            .filter(g => g.items.length > 0);

    /* ── Bireysel ürün güncelleme ── */
    const handleItemStatusUpdate = async (orderId: number, itemId: number, newStatus: number) => {
        try {
            await orderService.updateOrderItemStatus(orderId, itemId, newStatus);
            setOrders(prev =>
                prev.map(o => o.id !== orderId ? o : {
                    ...o,
                    orderItems: o.orderItems.map(i =>
                        i.id === itemId ? { ...i, status: newStatus } : i
                    ),
                })
            );
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ürün hazır olarak işaretlenemedi. Tekrar deneyin.'));
        }
    };

    /* ── Toplu sipariş güncelleme ── */
    const handleStatusUpdate = async (orderId: number, newOrderStatus: number) => {
        try {
            await orderService.updateOrderStatus(orderId, newOrderStatus);
            setOrders(prev =>
                prev.map(o => {
                    if (o.id !== orderId) return o;
                    const map = itemStatusMap[newOrderStatus];
                    const updatedItems = map
                        ? o.orderItems.map(i => i.status === map.from ? { ...i, status: map.to } : i)
                        : o.orderItems;
                    return { ...o, status: newOrderStatus, orderItems: updatedItems };
                })
            );
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Sipariş güncellenemedi. Tekrar deneyin.'));
        }
    };

    /* ── Kart üzerindeki "Hazır" aksiyonu: kategori filtresi yokken tüm siparişi,
       filtre varken sadece görünen (o kategoriye ait) ürünleri hazıra çeker ── */
    const handleReadyClick = (group: OrderGroup) => {
        const allItemsVisible = group.items.length === group.order.orderItems.filter(i => i.status === 1).length;
        if (allItemsVisible) {
            handleStatusUpdate(group.order.id, OrderStatus.Ready);
        } else {
            group.items.forEach(item => handleItemStatusUpdate(group.order.id, item.id, 3));
        }
    };

    useEffect(() => {
        orderService.getAllOrdersToKitchen()
            .then(all => { setOrders(all); setLoadState('ready'); })
            .catch(() => setLoadState('error'));
        categoryService.getCategories()
            .then(categories => setCategoryNames(categories.map(c => c.name)))
            .catch(console.error);
    }, []);

    useEffect(() => {
        const { connection: kitchenConn, stop: stopKitchenConn } = createHubConnection('/kitchen-hub');

        kitchenConn.on('ReceiveNewOrder', async () => {
            const all = await orderService.getAllOrdersToKitchen().catch(() => null);
            if (all) { setOrders(all); setLoadState('ready'); }
        });

        const { connection: tableConn, stop: stopTableConn } = createHubConnection('/table-hub');

        tableConn.on('OrderUpdated', async () => {
            const all = await orderService.getAllOrdersToKitchen().catch(() => null);
            if (all) { setOrders(all); setLoadState('ready'); }
        });

        tableConn.on('OrderClosed', (_tableId: number, closedOrderId: number) => {
            setOrders(prev => prev.filter(o => o.id !== closedOrderId));
        });

        let cancelled = false;
        kitchenConn.start().catch(err => { if (!cancelled) console.error('Kitchen SignalR:', err); });
        tableConn.start().catch(err => { if (!cancelled) console.error('Table SignalR:', err); });

        return () => {
            cancelled = true;
            stopKitchenConn();
            stopTableConn();
        };
    }, []);

    const retryLoad = () => {
        setLoadState('loading');
        orderService.getAllOrdersToKitchen()
            .then(all => { setOrders(all); setLoadState('ready'); })
            .catch(() => setLoadState('error'));
    };

    /* Stats portal — header slot'una enjekte et */
    const statsSlot = document.getElementById('kitchen-stats-slot');

    return (
        <>
            {/* Header stats portal */}
            {statsSlot && createPortal(
                <HeaderStatCounter label="Bekliyor" count={pendingGroups.length} color="text-rb-amber" />,
                statsSlot
            )}

            {/* Tek kutu */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Kategori sekmeleri */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0 border-b" style={{ scrollbarWidth: 'none' }}>
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`min-h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                            selectedCategory === null
                                ? 'bg-rb-accent text-rb-accent-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                        }`}
                    >
                        Tümü
                        <span className="ml-1.5 opacity-80">{allPendingGroups.reduce((sum, g) => sum + g.items.length, 0)}</span>
                    </button>
                    {categoryTabs.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`min-h-11 px-4 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                                selectedCategory === cat
                                    ? 'bg-rb-accent text-rb-accent-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                            }`}
                        >
                            {cat}
                            <span className="ml-1.5 opacity-80">{categoryCounts.get(cat) ?? 0}</span>
                        </button>
                    ))}
                </div>
                <ColumnHeader dot="bg-rb-amber" text="text-rb-amber" bg="bg-rb-amber-bg" label="Bekliyor" count={pendingGroups.length} />
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 flex-1 overflow-y-auto content-start">
                    {loadState === 'loading' ? (
                        <p className="col-span-full text-base text-muted-foreground text-center py-10">Yükleniyor...</p>
                    ) : loadState === 'error' ? (
                        <div role="alert" className="col-span-full flex flex-col items-center gap-3 py-10 text-center">
                            <p className="text-base font-semibold text-foreground">Siparişler yüklenemedi.</p>
                            <p className="text-sm text-muted-foreground">Bağlantınızı kontrol edip tekrar deneyin.</p>
                            <button
                                type="button"
                                onClick={retryLoad}
                                className="h-12 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                Tekrar dene
                            </button>
                        </div>
                    ) : pendingGroups.length === 0 ? (
                        <p className="col-span-full text-lg font-medium text-muted-foreground text-center py-10">Bekleyen sipariş yok</p>
                    ) : (
                        pendingGroups.map(g => (
                            <KitchenCard key={g.order.id} group={g} now={now} onItemUpdate={handleItemStatusUpdate} onReady={handleReadyClick} />
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
