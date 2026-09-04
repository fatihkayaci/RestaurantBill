import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '@/features/orders/types';
import * as signalR from '@microsoft/signalr';
import { orderService } from '@/features/orders/api/orderService';
import HeaderStatCounter from '@/components/layout/HeaderStatCounter';

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
        <div className={`bg-background border rounded-2xl overflow-hidden ${isUrgent ? 'border-rb-amber/40' : ''}`}>
            {/* Kart başlığı */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                <div>
                    <p className="font-serif font-bold text-lg text-foreground leading-none">
                        Masa {order.tableName}
                    </p>
                    {order.createdByUserName && (
                        <p className="text-xs text-muted-foreground mt-1">{order.createdByUserName}</p>
                    )}
                </div>
                <span className={isUrgent
                    ? 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-rb-amber-bg text-rb-amber'
                    : 'text-xs text-muted-foreground'
                }>
                    {formatElapsed(order.createdAt, now)}
                </span>
            </div>

            {/* Sipariş notu */}
            {order.note && (
                <div className="mx-4 mb-3 rounded-lg bg-rb-amber-bg text-rb-amber text-xs px-3 py-2">
                    <span className="font-bold">Not: </span>{order.note}
                </div>
            )}

            {/* Ürün listesi */}
            <div className="px-4 pb-3 space-y-0 divide-y divide-border">
                {items.map(item => (
                    <div key={item.id} className="py-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-muted-foreground text-xs">·</span>
                                <span className="text-sm text-foreground truncate">{item.productName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                                <button
                                    onClick={() => onItemUpdate(order.id, item.id, 3)}
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors text-rb-green hover:bg-rb-green-bg"
                                    title="Hazır işaretle"
                                >
                                    ✓
                                </button>
                            </div>
                        </div>
                        {item.note && (
                            <p className="text-xs text-rb-amber mt-0.5 pl-4">Not: {item.note}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Bulk aksiyon butonu */}
            <div className="px-4 pb-4">
                <button
                    onClick={() => onReady(group)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors bg-rb-green-bg hover:opacity-80 text-rb-green"
                >
                    Hazır ✓
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
    const [now, setNow] = useState(() => Date.now());
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    const categoryTabs = Array.from(categoryCounts.keys()).sort((a, b) => a.localeCompare(b, 'tr'));

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
            console.error('handleItemStatusUpdate:', err);
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
            console.error('handleStatusUpdate:', err);
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
            .then(setOrders)
            .catch(console.error);
    }, []);

    useEffect(() => {
        const kitchenConn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/kitchen-hub`, {
                accessTokenFactory: () => localStorage.getItem('token') ?? '',
            })
            .withAutomaticReconnect()
            .build();

        kitchenConn.on('ReceiveNewOrder', async () => {
            const all = await orderService.getAllOrdersToKitchen().catch(() => null);
            if (all) setOrders(all);
        });

        const tableConn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`, {
                accessTokenFactory: () => localStorage.getItem('token') ?? '',
            })
            .withAutomaticReconnect()
            .build();

        tableConn.on('OrderUpdated', async () => {
            const all = await orderService.getAllOrdersToKitchen().catch(() => null);
            if (all) setOrders(all);
        });

        tableConn.on('OrderClosed', (_tableId: number, closedOrderId: number) => {
            setOrders(prev => prev.filter(o => o.id !== closedOrderId));
        });

        let cancelled = false;
        kitchenConn.start().catch(err => { if (!cancelled) console.error('Kitchen SignalR:', err); });
        tableConn.start().catch(err => { if (!cancelled) console.error('Table SignalR:', err); });

        return () => {
            cancelled = true;
            kitchenConn.stop();
            tableConn.stop();
        };
    }, []);

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
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                            selectedCategory === null
                                ? 'bg-rb-accent text-white'
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
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                                selectedCategory === cat
                                    ? 'bg-rb-accent text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                            }`}
                        >
                            {cat}
                            <span className="ml-1.5 opacity-80">{categoryCounts.get(cat)}</span>
                        </button>
                    ))}
                </div>
                <ColumnHeader dot="bg-rb-amber" text="text-rb-amber" bg="bg-rb-amber-bg" label="Bekliyor" count={pendingGroups.length} />
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 flex-1 overflow-y-auto content-start">
                    {pendingGroups.length === 0 ? (
                        <p className="col-span-full text-xs text-muted-foreground text-center py-8">Bekleyen sipariş yok</p>
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
