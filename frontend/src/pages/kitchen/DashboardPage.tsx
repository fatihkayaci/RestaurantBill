import { useEffect, useState } from "react";
import type { Order } from "@/features/orders/types";
import * as signalR from "@microsoft/signalr";
import { orderService } from "@/features/orders/api/orderService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, ChefHat } from "lucide-react";
import KitchenOrderCard from "@/features/orders/components/KitchenOrderCard";

const OrderStatus = {
    Active: 1,
    Pending: 2,
    Preparing: 3,
    Ready: 4,
    Served: 5,
    Paid: 6,
    Cancelled: 7,
} as const;

export default function KitchenDashboardPage() {
    const [orders, setOrders] = useState<Order[]>([]);

    interface OrderGroup { order: Order; items: Order['orderItems']; colStatus: number }

    const orderGroups: OrderGroup[] = orders.flatMap(order => {
        const byStatus = [1, 2, 3].map(s => ({
            order,
            items: order.orderItems.filter(i => i.status === s),
            colStatus: s,
        }));
        return byStatus.filter(g => g.items.length > 0);
    });

    const pendingGroups = orderGroups.filter(g => g.colStatus === 1);
    const preparingGroups = orderGroups.filter(g => g.colStatus === 2);
    const readyGroups = orderGroups.filter(g => g.colStatus === 3);

    const itemStatusMap: Record<number, { from: number; to: number }> = {
        [OrderStatus.Preparing]: { from: 1, to: 2 },
        [OrderStatus.Ready]: { from: 2, to: 3 },
        [OrderStatus.Served]: { from: 3, to: 4 },
    };

    const handleItemStatusUpdate = async (orderId: number, itemId: number, newStatus: number) => {
        try {
            await orderService.updateOrderItemStatus(orderId, itemId, newStatus);
            setOrders(prev =>
                prev.map(o => {
                    if (o.id !== orderId) return o;
                    return {
                        ...o,
                        orderItems: o.orderItems.map(i =>
                            i.id === itemId ? { ...i, status: newStatus } : i
                        )
                    };
                })
            );
        } catch (err) {
            console.error("handleItemStatusUpdate error:", err);
        }
    };

    const handleStatusUpdate = async (orderId: number, newStatus: number) => {
        try {
            await orderService.updateOrderStatus(orderId, newStatus);
            setOrders((prev) =>
                prev.map((o) => {
                    if (o.id !== orderId) return o;
                    const map = itemStatusMap[newStatus];
                    const updatedItems = map
                        ? o.orderItems.map((i) =>
                            i.status === map.from ? { ...i, status: map.to } : i
                        )
                        : o.orderItems;
                    return { ...o, status: newStatus, orderItems: updatedItems };
                })
            );
        } catch (err) {
            console.error("handleStatusUpdate error:", err);
        }
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const all = await orderService.getAllOrdersToKitchen();
                setOrders(all);
            } catch (err) {
                console.error("fetchOrders error:", err);
            }
        };
        fetchOrders();
    }, []);

    useEffect(() => {
        const kitchenConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/kitchen-hub`)
            .withAutomaticReconnect()
            .build();

        kitchenConnection.on("ReceiveNewOrder", async () => {
            try {
                const all = await orderService.getAllOrdersToKitchen();
                setOrders(all);
            } catch (err) {
                console.error("ReceiveNewOrder refresh error:", err);
            }
        });

        const tableConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/table-hub`)
            .withAutomaticReconnect()
            .build();

        tableConnection.on("OrderUpdated", async () => {
            try {
                const all = await orderService.getAllOrdersToKitchen();
                setOrders(all);
            } catch {
                // silently ignore
            }
        });

        tableConnection.on("OrderClosed", (_tableId: number, closedOrderId: number) => {
            setOrders((prev) => prev.filter((o) => o.id !== closedOrderId));
        });

        let isCancelled = false;

        kitchenConnection.start()
            .catch((err) => { if (!isCancelled) console.error("SignalR Kitchen Connection Error:", err); });

        tableConnection.start()
            .catch((err) => { if (!isCancelled) console.error("SignalR Table Connection Error:", err); });

        return () => {
            isCancelled = true;
            kitchenConnection.stop();
            tableConnection.stop();
        };
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm text-amber-800 font-medium">Bekliyor</p>
                            <p className="text-3xl font-bold text-amber-900">{pendingGroups.length}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-200">
                            <Clock className="h-6 w-6 text-amber-700" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm text-blue-800 font-medium">Hazırlanıyor</p>
                            <p className="text-3xl font-bold text-blue-900">{preparingGroups.length}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-200">
                            <ChefHat className="h-6 w-6 text-blue-700" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-sm text-green-800 font-medium">Hazır</p>
                            <p className="text-3xl font-bold text-green-900">{readyGroups.length}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200">
                            <CheckCircle2 className="h-6 w-6 text-green-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="h-3 w-3 rounded-full bg-amber-500" />
                        <h2 className="font-semibold">Yeni Siparişler</h2>
                        <Badge variant="secondary">{pendingGroups.length}</Badge>
                    </div>
                    <div className="space-y-4">
                        {pendingGroups.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Bekleyen sipariş yok</p>
                        ) : (
                            pendingGroups.map(g => (
                                <KitchenOrderCard
                                    key={`${g.order.id}-pending`}
                                    order={g.order}
                                    visibleItems={g.items}
                                    onAccept={(id) => handleStatusUpdate(id, OrderStatus.Preparing)}
                                    onItemAccept={(orderId, itemId) => handleItemStatusUpdate(orderId, itemId, 2)}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <h2 className="font-semibold">Hazırlanıyor</h2>
                        <Badge variant="secondary">{preparingGroups.length}</Badge>
                    </div>
                    <div className="space-y-4">
                        {preparingGroups.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Hazırlanan sipariş yok</p>
                        ) : (
                            preparingGroups.map(g => (
                                <KitchenOrderCard
                                    key={`${g.order.id}-preparing`}
                                    order={g.order}
                                    visibleItems={g.items}
                                    showBatches
                                    onReady={(id) => handleStatusUpdate(id, OrderStatus.Ready)}
                                    onItemReady={(orderId, itemId) => handleItemStatusUpdate(orderId, itemId, 3)}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <h2 className="font-semibold">Servise Hazır</h2>
                        <Badge variant="secondary">{readyGroups.length}</Badge>
                    </div>
                    <div className="space-y-4">
                        {readyGroups.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Hazır sipariş yok</p>
                        ) : (
                            readyGroups.map(g => (
                                <KitchenOrderCard
                                    key={`${g.order.id}-ready`}
                                    order={g.order}
                                    visibleItems={g.items}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
