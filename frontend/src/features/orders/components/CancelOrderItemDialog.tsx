import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { orderService } from '@/features/orders/api/orderService';
import type { Order, OrderItem } from '@/features/orders/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
    order: Order;
    /** İptal edilecek satır; null iken pencere kapalıdır. */
    item: OrderItem | null;
    onClose: () => void;
    /** İptal sunucuya yazıldı; ekran siparişi yeniden çeker. */
    onCancelled: () => void;
}

/**
 * "Tutar gir" ile ödeme alınmış hesap, ürün iptaliyle alınan tutarın altına inemez (sunucu da reddeder).
 * Ödenmiş ürün adetleri satırda zaten kalmaz; satırdaki adet ödenmemiş adettir.
 */
function cancellableQuantity(order: Order, item: OrderItem): number {
    const paid = order.paidAmount ?? 0;
    if (paid <= 0 || item.unitPrice <= 0) return item.quantity;
    const room = order.totalPrice - paid;
    return Math.max(0, Math.min(item.quantity, Math.floor(room / item.unitPrice + 1e-9)));
}

// Ürün bazlı iptal: satırın bir kısmı (3 ayrandan 1'i) ya da tamamı. Menü satırında menü adedi iptal edilir.
export default function CancelOrderItemDialog({ order, item, onClose, onCancelled }: Props) {
    return (
        <AlertDialog open={item !== null} onOpenChange={open => { if (!open) onClose(); }}>
            <AlertDialogContent>
                {item && <CancelForm key={item.id} order={order} item={item} onClose={onClose} onCancelled={onCancelled} />}
            </AlertDialogContent>
        </AlertDialog>
    );
}

function CancelForm({ order, item, onClose, onCancelled }: Props & { item: OrderItem }) {
    const max = cancellableQuantity(order, item);
    const [quantity, setQuantity] = useState(Math.min(1, max));
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const isSetMenu = !!item.setMenuId;
    const all = quantity === item.quantity;
    const inKitchen = item.status === 1 || item.status === 2;

    const confirm = async () => {
        if (busy || quantity < 1) return;
        setBusy(true);
        try {
            await orderService.cancelOrderLine(order.id, item.id, quantity, reason);
            toast.success(all ? `${item.productName} iptal edildi.` : `${quantity} adet ${item.productName} iptal edildi.`);
            onCancelled();
            onClose();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ürün iptal edilemedi.'));
        } finally {
            setBusy(false);
        }
    };

    const stepButton = 'flex size-11 items-center justify-center rounded-full border border-border bg-background text-foreground disabled:opacity-40';

    return (
        <>
            <AlertDialogHeader>
                <AlertDialogTitle>Ürünü iptal et</AlertDialogTitle>
                <AlertDialogDescription>
                    {item.quantity}× {item.productName}
                    {isSetMenu && ' · menünün içindeki ürünler de aynı adet kadar iptal edilir'}
                    {inKitchen && ' · mutfak ekranından da düşer'}
                </AlertDialogDescription>
            </AlertDialogHeader>

            {max === 0 ? (
                <p className="rounded-xl bg-rb-amber-bg px-3.5 py-3 text-sm text-foreground">
                    Bu hesaptan ₺{formatPrice(order.paidAmount ?? 0)} ödeme alınmış; bu ürün iptal edilirse hesap ödenen tutarın altına iner.
                </p>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">İptal edilecek adet</span>
                        <div className="flex items-center gap-2">
                            <button type="button" className={stepButton} onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                disabled={quantity <= 1 || busy} aria-label="Bir azalt">
                                <Minus className="size-4" aria-hidden="true" />
                            </button>
                            <span className="min-w-8 text-center text-xl font-bold tabular-nums text-foreground" aria-live="polite">{quantity}</span>
                            <button type="button" className={stepButton} onClick={() => setQuantity(q => Math.min(max, q + 1))}
                                disabled={quantity >= max || busy} aria-label="Bir artır">
                                <Plus className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    {max > 1 && (
                        <button
                            type="button"
                            onClick={() => setQuantity(max)}
                            disabled={busy}
                            aria-pressed={quantity === max}
                            className={cn('min-h-11 rounded-xl border text-sm font-semibold transition-colors',
                                quantity === max ? 'border-rb-red/40 bg-rb-red-bg text-rb-red' : 'border-border text-foreground hover:bg-muted')}
                        >
                            {max === item.quantity ? `Tümünü iptal et (${max})` : `İptal edilebilen tümü (${max})`}
                        </button>
                    )}
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold text-muted-foreground">Neden (isteğe bağlı)</span>
                        <input
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            maxLength={200}
                            placeholder="Müşteri vazgeçti, yanlış girildi…"
                            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-rb-gold"
                        />
                    </label>
                    {max < item.quantity && (
                        <p className="text-[13px] text-muted-foreground">
                            Hesaptan ₺{formatPrice(order.paidAmount ?? 0)} ödeme alındığı için en fazla {max} adet iptal edilebilir.
                        </p>
                    )}
                    <div className="flex items-baseline justify-between border-t border-border pt-3 text-sm">
                        <span className="text-muted-foreground">Hesaptan düşecek</span>
                        <span className="text-base font-bold tabular-nums text-foreground">₺{formatPrice(item.unitPrice * quantity)}</span>
                    </div>
                </div>
            )}

            <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
                {max > 0 && (
                    <Button variant="danger" onClick={() => void confirm()} disabled={busy || quantity < 1}>
                        {busy ? 'İptal ediliyor…' : all ? 'Satırı iptal et' : `${quantity} adet iptal et`}
                    </Button>
                )}
            </AlertDialogFooter>
        </>
    );
}
