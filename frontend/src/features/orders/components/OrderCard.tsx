import type { OrderItem } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface OrderCardProps {
    item: OrderItem;
    increaseQuantity: (productId: number) => void;
    decreaseQuantity: (productId: number) => void;
    onUpdateQuantity: (productId: number, quantity: number) => void;
    removeItem: (productId: number) => void;
}

export default function OrderCard({ item, increaseQuantity, decreaseQuantity, onUpdateQuantity, removeItem }: OrderCardProps) {

    const getStatusBadge = (status: number) => {
        switch (status) {
            case 1:
                return (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        Yeni
                    </Badge>
                );
            case 2:
                return (
                    <Badge variant="outline" className="text-[10px] px-2 py-0 text-amber-500 border-amber-500/30 bg-amber-500/10 animate-pulse">
                        Hazırlanıyor
                    </Badge>
                );
            case 3:
                return (
                    <Badge variant="outline" className="text-[10px] px-2 py-0 text-green-500 border-green-500/30 bg-green-500/10 shadow-[0_0_8px_rgba(34,197,94,0.2)]">
                        HAZIR
                    </Badge>
                );
            default:
                return null;
        }
    };

    const isLocalItem = item.is_load === false;
    const isPendingApproved = item.is_load === true && item.status === 1;
    const isLocked = item.is_load === true && item.status !== 1;

    const handleDecrease = () => {
        if (isLocalItem) {
            decreaseQuantity(item.productId);
        } else if (isPendingApproved) {
            if (item.quantity > 1) {
                onUpdateQuantity(item.productId, item.quantity - 1);
            }
        }
    };

    const handleIncrease = () => {
        if (isLocalItem) {
            increaseQuantity(item.productId);
        } else if (isPendingApproved) {
            onUpdateQuantity(item.productId, item.quantity + 1);
        }
    };

    return (
        <div className="bg-card p-4 rounded-xl mb-3 shadow-sm border flex items-center justify-between transition-all hover:border-border/80">
            <div className="flex flex-col gap-1.5">
                <div className="font-bold text-foreground">
                    {item.productName}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {item.unitPrice} ₺
                    </span>
                    {getStatusBadge(item.status)}
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDecrease}
                    disabled={isLocked}
                    className={`h-8 w-8 rounded-lg border transition-all active:scale-95 ${
                        !isLocked && "text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                    }`}
                >
                    <Minus className="h-4 w-4" />
                </Button>

                <span className="font-bold text-lg w-8 text-center text-foreground">
                    {item.quantity}
                </span>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleIncrease}
                    disabled={isLocked}
                    className={`h-8 w-8 rounded-lg border transition-all active:scale-95 ${
                        !isLocked && "text-blue-500 hover:bg-blue-500 hover:text-white border-blue-500/30"
                    }`}
                >
                    <Plus className="h-4 w-4" />
                </Button>

                {!isLocked && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.productId)}
                        className="h-8 w-8 ml-1 rounded-lg text-destructive hover:bg-destructive/10 transition-all active:scale-95"
                        title="Ürünü Çıkar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
