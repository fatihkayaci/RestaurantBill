import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag, Volume2, VolumeX } from 'lucide-react';
import { deliveryService } from '@/features/delivery/api/deliveryService';
import {
    isOnlineOrderSeen, markOnlineOrderSeen, setNewOnlineOrderIds, subscribeNewOnlineOrders, subscribeOnlineOrders,
    useNewOnlineOrderCounts,
} from '@/features/delivery/onlineOrdersHub';
import { onlineOrderSound, playNewOnlineOrderSound } from '@/features/delivery/onlineOrderSound';
import { boardOrderPath, orderTitle } from '@/features/delivery/deliveryStatus';
import { DeliveryStatus, type DeliveryOrder } from '@/features/delivery/types';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

const REPEAT_MS = 10_000;
const toastId = (orderId: string) => `online-order-${orderId}`;

interface Props {
    /** Panonun adresi; "?siparis=<id>" eklenerek siparişin detayı açılır. */
    boardPath: string;
}

// Yeni online paket siparişi: kasiyer ve yönetici ekranlarında kalıcı uyarı ve siparişi biri açana ya da kabul/ret
// edene kadar 10 sn'de bir tekrar eden ses. Başlıkta ses düğmesi ve onay bekleyen sipariş sayısı (rozet) durur.
// Ses tercihi cihazda saklanır (lib/soundToggle); tarayıcı ilk dokunuşa kadar sesi kilitli tutabilir.
export default function OnlineOrderAlerts({ boardPath }: Props) {
    const navigate = useNavigate();
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [pending, setPending] = useState<DeliveryOrder[]>([]);
    const { newCount } = useNewOnlineOrderCounts();
    const shown = useRef(new Set<string>());

    const load = useCallback(() => {
        deliveryService.getOrders('active')
            .then(list => {
                const fresh = list.filter(o => o.status === DeliveryStatus.Received);
                setNewOnlineOrderIds(fresh.map(o => o.id));
                setPending(fresh);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        load();
        deliveryService.getStatus().then(s => setEnabled(s.enabled)).catch(() => setEnabled(null));
        const unsubscribe = subscribeOnlineOrders(load);
        window.addEventListener('focus', load);
        return () => {
            unsubscribe();
            window.removeEventListener('focus', load);
        };
    }, [load]);

    const open = useCallback((order: DeliveryOrder) => {
        markOnlineOrderSeen(order.id);
        navigate(boardOrderPath(boardPath, order.id));
    }, [boardPath, navigate]);

    // Kalıcı uyarılar: görülmemiş her yeni sipariş için bir tane; görülünce ya da yanıtlanınca kalkar.
    const syncToasts = useCallback(() => {
        const unseen = pending.filter(o => !isOnlineOrderSeen(o.id));
        let arrived = false;
        for (const order of unseen) {
            if (shown.current.has(order.id)) continue;
            shown.current.add(order.id);
            arrived = true;
            toast.warning(`Yeni paket siparişi ${orderTitle(order)} · ₺${formatAmount(order.total)}`, {
                id: toastId(order.id),
                description: `${order.lines.reduce((s, l) => s + l.quantity, 0)} ürün · kapıda ${order.paymentPreference === 2 ? 'nakit' : 'kart'}`,
                duration: Infinity,
                dismissible: false,
                action: { label: 'Aç', onClick: () => open(order) },
            });
        }
        const keep = new Set(unseen.map(o => o.id));
        for (const id of [...shown.current]) {
            if (keep.has(id)) continue;
            shown.current.delete(id);
            toast.dismiss(toastId(id));
        }
        if (arrived) playNewOnlineOrderSound();
    }, [pending, open]);

    useEffect(() => {
        syncToasts();
        return subscribeNewOnlineOrders(syncToasts);
    }, [syncToasts]);

    // Görülmemiş yeni sipariş kaldıkça ses tekrar eder.
    useEffect(() => {
        const timer = setInterval(() => {
            if (pending.some(o => !isOnlineOrderSeen(o.id))) playNewOnlineOrderSound();
        }, REPEAT_MS);
        return () => clearInterval(timer);
    }, [pending]);

    // Sayfadan çıkınca (çıkış, rol değişimi) uyarılar kalmasın.
    useEffect(() => () => {
        const ids = shown.current;
        ids.forEach(id => toast.dismiss(toastId(id)));
        ids.clear();
    }, []);

    if (enabled === false && newCount === 0) return null;

    return (
        <div className="flex items-center gap-1.5">
            <OnlineOrderSoundToggle />
            <button
                type="button"
                onClick={() => navigate(boardPath)}
                aria-label={newCount > 0 ? `Online siparişler, ${newCount} yeni` : 'Online siparişler'}
                title="Online siparişler"
                className={cn(
                    'flex min-h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors',
                    newCount > 0
                        ? 'border-rb-accent/60 bg-rb-accent text-rb-accent-foreground hover:opacity-90'
                        : 'border-white/10 bg-white/[0.03] text-sidebar-foreground/75 hover:bg-white/[0.06]'
                )}
            >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                <span className="hidden whitespace-nowrap sm:inline">Paket</span>
                {newCount > 0 && <span className="min-w-4 rounded-full bg-white/25 px-1.5 text-center tabular-nums">{newCount}</span>}
            </button>
        </div>
    );
}

function OnlineOrderSoundToggle() {
    const state = useSyncExternalStore(onlineOrderSound.subscribe, onlineOrderSound.getState);
    const on = state === 'on';
    const label = on ? 'Paket sipariş sesini kapat' : 'Paket sipariş sesini aç';
    return (
        <button
            type="button"
            data-online-order-sound-toggle
            onClick={onlineOrderSound.toggle}
            aria-pressed={on}
            aria-label={label}
            title={state === 'locked' ? 'Tarayıcı sesi bekletiyor; açmak için dokunun' : label}
            className={cn(
                'flex min-h-10 items-center rounded-lg border px-2.5 transition-colors',
                on
                    ? 'border-white/10 bg-white/[0.03] text-sidebar-foreground/75 hover:bg-white/[0.06]'
                    : 'border-rb-gold/45 bg-rb-gold/15 text-rb-gold hover:bg-rb-gold/25'
            )}
        >
            {on ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
        </button>
    );
}
