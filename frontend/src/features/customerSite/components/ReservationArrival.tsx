import { useState } from 'react';
import { ChefHat, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { customerRequestService } from '../api/customerRequestService';
import {
    ORDER_REQUEST_CANCELLED, ORDER_REQUEST_EXPIRED, ORDER_REQUEST_PENDING, RESERVATION_CONFIRMED, type StaffReservation,
} from '../types';

// Admin "Rezervasyonlar" ve garson "Rezervasyon" sekmesinin ortak ön sipariş parçaları: rozet, kalem listesi ve
// "Geldi" / "Gelmedi" / "Mutfağa şimdi gönder" düğmeleri.

const hasPendingPreOrder = (r: StaffReservation) => r.preOrder?.status === ORDER_REQUEST_PENDING;

export function PreOrderBadge({ reservation, className }: { reservation: StaffReservation; className?: string }) {
    if (!hasPendingPreOrder(reservation)) return null;
    return (
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full bg-rb-gold px-2 py-0.5 text-xs font-bold text-rb-gold-foreground', className)}>
            <ShoppingBag className="size-3.5" aria-hidden="true" />
            Ön sipariş
        </span>
    );
}

/** Son ön siparişin kalemleri ve toplamı; iptal/süresi dolmuşsa tek satırlık bilgi. */
export function PreOrderPanel({ reservation }: { reservation: StaffReservation }) {
    const preOrder = reservation.preOrder;
    if (!preOrder) return null;

    if (preOrder.status === ORDER_REQUEST_CANCELLED || preOrder.status === ORDER_REQUEST_EXPIRED) {
        return (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-rb-text-sub">
                {preOrder.status === ORDER_REQUEST_CANCELLED ? 'Ön sipariş iptal edildi.' : 'Ön siparişin süresi doldu; mutfağa gönderilmedi.'}
            </p>
        );
    }

    const pending = preOrder.status === ORDER_REQUEST_PENDING;
    return (
        <div className="flex flex-col gap-1.5 rounded-xl border border-rb-gold/50 bg-rb-gold-bg px-3 py-2.5 text-sm text-foreground">
            <p className="flex items-center gap-1.5 font-semibold">
                <ChefHat className="size-4 shrink-0" aria-hidden="true" />
                {pending ? 'Ön sipariş · misafir gelince mutfağa gider' : 'Ön sipariş mutfağa gönderildi'}
            </p>
            <ul className="flex flex-col gap-0.5">
                {preOrder.items.map((item, i) => (
                    <li key={`${item.productId}-${i}`} className="flex justify-between gap-3">
                        <span className="min-w-0">
                            <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.productName}
                            {item.note && <span className="text-rb-text-sub"> · {item.note}</span>}
                        </span>
                        <span className="shrink-0 tabular-nums">{formatPrice(item.unitPrice * item.quantity)} ₺</span>
                    </li>
                ))}
            </ul>
            <p className="flex justify-between border-t border-rb-gold/40 pt-1 font-bold">
                <span>Toplam</span>
                <span className="tabular-nums">{formatPrice(preOrder.total)} ₺</span>
            </p>
            {preOrder.note && <p><span className="font-semibold">Not:</span> {preOrder.note}</p>}
        </div>
    );
}

type Action = 'seat' | 'noShow' | 'fire';

const DONE: Record<Action, string> = {
    seat: 'Misafir oturtuldu.',
    noShow: 'Rezervasyon "gelmedi" olarak işaretlendi.',
    fire: 'Ön sipariş mutfağa gönderildi.',
};

/** Onaylı rezervasyonun "Geldi", "Gelmedi" ve (bekleyen ön sipariş varsa) "Mutfağa şimdi gönder" düğmeleri. */
export function ReservationArrivalActions({ reservation, onChanged, disabled = false, className }: {
    reservation: StaffReservation;
    onChanged: () => void;
    disabled?: boolean;
    className?: string;
}) {
    const [busy, setBusy] = useState(false);
    const [confirming, setConfirming] = useState<Action | null>(null);
    // Liste her değişiklikte yeniden çekilir; düğmenin açılması için ekranın açıldığı an yeterli.
    const [openedAt] = useState(() => Date.now());

    if (reservation.status !== RESERVATION_CONFIRMED) return null;

    const pendingPreOrder = hasPendingPreOrder(reservation);
    // "Gelmedi" rezervasyon saati gelmeden işaretlenemez (sunucu da reddeder).
    const started = new Date(reservation.startsAtUtc).getTime() <= openedAt;

    const run = async (action: Action) => {
        if (busy) return;
        setBusy(true);
        setConfirming(null);
        try {
            if (action === 'seat') await customerRequestService.seatReservation(reservation.id);
            else if (action === 'noShow') await customerRequestService.markReservationNoShow(reservation.id);
            else await customerRequestService.firePreOrder(reservation.id);
            toast.success(DONE[action], action === 'seat' && pendingPreOrder ? { description: 'Ön sipariş mutfağa gönderildi.' } : undefined);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'İşlem yapılamadı.'));
        } finally {
            setBusy(false);
            onChanged();
        }
    };

    // Masada açık hesap varken ön sipariş o hesaba eklenir; personel bunu bilerek onaylamalı.
    const seat = () => (pendingPreOrder && reservation.tableHasOpenOrder ? setConfirming('seat') : run('seat'));

    const dialog = confirming && {
        seat: {
            title: 'Masada açık hesap var',
            text: `${reservation.tableName} masasında ödenmemiş bir hesap var. Ön sipariş bu hesaba eklenip mutfağa gönderilecek.`,
            confirm: 'Yine de oturt',
        },
        fire: {
            title: 'Mutfağa şimdi gönderilsin mi?',
            text: `${reservation.guestName} henüz gelmedi. Ön sipariş şimdi mutfağa gidecek ve rezervasyon "geldi" sayılacak (${reservation.tableName} açılır).`,
            confirm: 'Mutfağa gönder',
        },
        noShow: {
            title: '"Gelmedi" olarak işaretlensin mi?',
            text: pendingPreOrder
                ? `${reservation.guestName} rezervasyonu kapanacak ve ön siparişi iptal edilecek.`
                : `${reservation.guestName} rezervasyonu kapanacak.`,
            confirm: 'Gelmedi',
        },
    }[confirming];

    const off = disabled || busy;
    return (
        <>
            <div className={cn('grid grid-cols-2 gap-2', className)}>
                <button
                    type="button"
                    onClick={seat}
                    disabled={off}
                    className="h-11 rounded-[10px] bg-rb-green text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    Geldi
                </button>
                <button
                    type="button"
                    onClick={() => setConfirming('noShow')}
                    disabled={off || !started}
                    title={started ? undefined : 'Rezervasyon saatinden sonra işaretlenebilir'}
                    className="h-11 rounded-[10px] border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:border-rb-red hover:text-rb-red disabled:opacity-50"
                >
                    Gelmedi
                </button>
                {pendingPreOrder && (
                    <button
                        type="button"
                        onClick={() => setConfirming('fire')}
                        disabled={off}
                        className="col-span-2 h-11 rounded-[10px] border border-rb-gold bg-rb-gold-bg text-sm font-semibold text-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        Mutfağa şimdi gönder
                    </button>
                )}
            </div>

            <AlertDialog open={dialog !== null} onOpenChange={open => !open && setConfirming(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialog ? dialog.title : ''}</AlertDialogTitle>
                        <AlertDialogDescription>{dialog ? dialog.text : ''}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <Button
                            variant={confirming === 'noShow' ? 'destructive' : 'default'}
                            onClick={() => confirming && run(confirming)}
                            disabled={busy}
                        >
                            {dialog ? dialog.confirm : ''}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
