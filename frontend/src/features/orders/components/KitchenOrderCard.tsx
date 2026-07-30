import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHat, CheckCircle2 } from 'lucide-react';
import type { Order, OrderItem } from '../types';

interface KitchenOrderCardProps {
    order: Order;
    visibleItems: OrderItem[];
    showBatches?: boolean;
    onAccept?: (orderId: number) => void;
    onReady?: (orderId: number) => void;
    onItemAccept?: (orderId: number, itemId: number) => void;
    onItemReady?: (orderId: number, itemId: number) => void;
}

function splitIntoBatches(items: OrderItem[]): OrderItem[][] {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => a.id - b.id);
    const batches: OrderItem[][] = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].id - sorted[i - 1].id > 3) {
            batches.push([sorted[i]]);
        } else {
            batches[batches.length - 1].push(sorted[i]);
        }
    }
    return batches;
}

function mergeByProduct(items: OrderItem[]): OrderItem[] {
    const map = new Map<number, OrderItem>();
    for (const item of items) {
        const existing = map.get(item.productId);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            map.set(item.productId, { ...item });
        }
    }
    return Array.from(map.values());
}

export default function KitchenOrderCard({ order, visibleItems, showBatches, onAccept, onReady, onItemAccept, onItemReady }: KitchenOrderCardProps) {
    const groups = showBatches
        ? splitIntoBatches(visibleItems)
        : [mergeByProduct(visibleItems)];

    const hasItemButtons = onItemAccept || onItemReady;

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Masa {order.tableId}</CardTitle>
                    <span className="text-sm text-muted-foreground font-mono">#{order.id}</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    {groups.map((group, idx) => (
                        <div key={idx}>
                            {idx > 0 && <div className="border-t my-3" />}
                            <div className="space-y-1">
                                {group.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-2 py-1">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                                {item.quantity}
                                            </span>
                                            <span className="text-sm font-medium">{item.productName}</span>
                                        </div>
                                        {hasItemButtons && (
                                            <div className="flex gap-1">
                                                {onItemAccept && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-xs gap-1"
                                                        onClick={() => onItemAccept(order.id, item.id)}
                                                    >
                                                        <ChefHat className="h-3 w-3" />
                                                        Hazırla
                                                    </Button>
                                                )}
                                                {onItemReady && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-xs gap-1 text-rb-green border-rb-green/30 hover:bg-rb-green-bg"
                                                        onClick={() => onItemReady(order.id, item.id)}
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Hazır
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {(onAccept || onReady) && (
                    <div className="flex gap-2 pt-2 border-t">
                        {onAccept && (
                            <Button className="flex-1 gap-2" onClick={() => onAccept(order.id)}>
                                <ChefHat className="h-4 w-4" />
                                Tümünü Hazırla
                            </Button>
                        )}
                        {onReady && (
                            <Button className="flex-1 gap-2" variant="secondary" onClick={() => onReady(order.id)}>
                                <CheckCircle2 className="h-4 w-4" />
                                Tümü Hazır
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
