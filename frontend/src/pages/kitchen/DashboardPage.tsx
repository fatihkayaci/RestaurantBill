import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '@/features/orders/types';
import * as signalR from '@microsoft/signalr';
import { orderService } from '@/features/orders/api/orderService';

const OrderStatus = {
    Preparing: 3,
    Ready: 4,
    Served: 5,
} as const;

const itemStatusMap: Record<number, { from: number; to: number }> = {
    [OrderStatus.Preparing]: { from: 1, to: 2 },
    [OrderStatus.Ready]: { from: 2, to: 3 },
    [OrderStatus.Served]: { from: 3, to: 4 },
};

interface OrderGroup {
    order: Order;
    items: Order['orderItems'];
    colStatus: number;
}

/* ── Tek kart bileşeni ── */
function KitchenCard({
    group,
    onItemUpdate,
    onBulkUpdate,
}: {
    group: OrderGroup;
    onItemUpdate: (orderId: number, itemId: number, newStatus: number) => void;
    onBulkUpdate: (orderId: number, newOrderStatus: number) => void;
}) {
    const { order, items, colStatus } = group;

    const bulkButton = colStatus === 1
        ? { label: 'Hazırlamaya Başla →', action: OrderStatus.Preparing, cls: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:text-blue-400' }
        : colStatus === 2
        ? { label: 'Hazır ✓', action: OrderStatus.Ready, cls: 'bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:bg-green-500/15 dark:hover:bg-green-500/25 dark:text-green-400' }
        : { label: 'Garson Çağrıldı — Teslim', action: OrderStatus.Served, cls: 'bg-muted/60 text-muted-foreground/60 cursor-default' };

    const itemNextStatus = colStatus === 1 ? 2 : colStatus === 2 ? 3 : null;

    return (
        <div className="bg-background border rounded-2xl overflow-hidden">
            {/* Kart başlığı */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                <div>
                    <p className="font-serif font-bold text-lg text-foreground leading-none">
                        Masa {order.tableId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">— · 0dk</p>
                </div>
                <span className="text-xs text-muted-foreground">0dk</span>
            </div>

            {/* Ürün listesi */}
            <div className="px-4 pb-3 space-y-0 divide-y divide-border">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-sm text-foreground">{item.productName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                            {itemNextStatus && (
                                <button
                                    onClick={() => onItemUpdate(order.id, item.id, itemNextStatus)}
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                                        colStatus === 1
                                            ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40'
                                    }`}
                                    title={colStatus === 1 ? 'Hazırlamaya başla' : 'Hazır işaretle'}
                                >
                                    {colStatus === 1 ? '→' : '✓'}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bulk aksiyon butonu */}
            <div className="px-4 pb-4">
                <button
                    onClick={() => colStatus !== 3 && onBulkUpdate(order.id, bulkButton.action)}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${bulkButton.cls}`}
                    disabled={colStatus === 3}
                >
                    {bulkButton.label}
                </button>
            </div>
        </div>
    );
}

/* ── Column başlığı ── */
function ColumnHeader({ dot, label, count }: { dot: string; label: string; count: number }) {
    return (
        <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-3 bg-background/95 backdrop-blur-sm border-b mb-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{label}</span>
            <span className="ml-auto text-xs font-bold text-muted-foreground">{count}</span>
        </div>
    );
}

/* ── Stats portal chip ── */
function StatsChip({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <div className={`flex flex-col items-center px-3 py-1 rounded-lg ${color}`}>
            <span className="text-sm font-bold leading-none">{count}</span>
            <span className="text-[9px] font-semibold tracking-widest uppercase mt-0.5 opacity-80">{label}</span>
        </div>
    );
}

export default function KitchenDashboardPage() {
    const [orders, setOrders] = useState<Order[]>([]);

    const orderGroups: OrderGroup[] = orders.flatMap(order => {
        return [1, 2, 3].map(s => ({
            order,
            items: order.orderItems.filter(i => i.status === s),
            colStatus: s,
        })).filter(g => g.items.length > 0);
    });

    const pendingGroups   = orderGroups.filter(g => g.colStatus === 1);
    const preparingGroups = orderGroups.filter(g => g.colStatus === 2);
    const readyGroups     = orderGroups.filter(g => g.colStatus === 3);

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
            if (newOrderStatus === OrderStatus.Served) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
            }
        } catch (err) {
            console.error('handleStatusUpdate:', err);
        }
    };

    useEffect(() => {
        orderService.getAllOrdersToKitchen()
            .then(setOrders)
            .catch(console.error);
    }, []);

    useEffect(() => {
        const kitchenConn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/kitchen-hub`)
            .withAutomaticReconnect()
            .build();

        kitchenConn.on('ReceiveNewOrder', async () => {
            const all = await orderService.getAllOrdersToKitchen().catch(() => null);
            if (all) setOrders(all);
        });

        const tableConn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`)
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
                <>
                    <StatsChip label="Bekliyor"      count={pendingGroups.length}   color="text-amber-400" />
                    <StatsChip label="Hazırlanıyor"  count={preparingGroups.length} color="text-blue-400" />
                    <StatsChip label="Hazır"         count={readyGroups.length}     color="text-green-400" />
                </>,
                statsSlot
            )}

            {/* 3 sütun kanban */}
            <div className="flex-1 grid grid-cols-3 divide-x divide-border overflow-hidden">
                {/* BEKLIYOR */}
                <div className="overflow-y-auto flex flex-col">
                    <ColumnHeader dot="bg-amber-500" label="Bekliyor" count={pendingGroups.length} />
                    <div className="p-4 space-y-3 flex-1">
                        {pendingGroups.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">Bekleyen sipariş yok</p>
                        ) : (
                            pendingGroups.map(g => (
                                <KitchenCard key={`${g.order.id}-pending`} group={g} onItemUpdate={handleItemStatusUpdate} onBulkUpdate={handleStatusUpdate} />
                            ))
                        )}
                    </div>
                </div>

                {/* HAZIRLANIYOR */}
                <div className="overflow-y-auto flex flex-col">
                    <ColumnHeader dot="bg-blue-500" label="Hazırlanıyor" count={preparingGroups.length} />
                    <div className="p-4 space-y-3 flex-1">
                        {preparingGroups.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">Hazırlanan sipariş yok</p>
                        ) : (
                            preparingGroups.map(g => (
                                <KitchenCard key={`${g.order.id}-preparing`} group={g} onItemUpdate={handleItemStatusUpdate} onBulkUpdate={handleStatusUpdate} />
                            ))
                        )}
                    </div>
                </div>

                {/* HAZIR */}
                <div className="overflow-y-auto flex flex-col">
                    <ColumnHeader dot="bg-green-500" label="Hazır" count={readyGroups.length} />
                    <div className="p-4 space-y-3 flex-1">
                        {readyGroups.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">Hazır sipariş yok</p>
                        ) : (
                            readyGroups.map(g => (
                                <KitchenCard key={`${g.order.id}-ready`} group={g} onItemUpdate={handleItemStatusUpdate} onBulkUpdate={handleStatusUpdate} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
