import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { BellRing, ShoppingBag, Volume2, VolumeX, X } from 'lucide-react';
import { deliveryService } from '@/features/delivery/api/deliveryService';
import {
    isOnlineOrderSeen, markOnlineOrderSeen, setNewOnlineOrderIds, subscribeNewOnlineOrders, subscribeOnlineOrders,
    useNewOnlineOrderCounts,
} from '@/features/delivery/onlineOrdersHub';
import { onlineOrderSound, playNewOnlineOrderSound } from '@/features/delivery/onlineOrderSound';
import { boardOrderPath, countdownText, orderTitle } from '@/features/delivery/deliveryStatus';
import { DeliveryStatus, type DeliveryOrder } from '@/features/delivery/types';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { setStaffAlertCount } from '@/lib/staffAlerts';

const REPEAT_MS = 10_000;

/** Kabukların (AppShell, RoleShell) başlığının altındaki şerit yuvası; aynı id kabuklarda elle yazılı. */
const ONLINE_ORDER_STRIP_SLOT_ID = 'online-order-strip-slot';

/** Pano adresinde miyiz: yol aynı ve panonun sorgu parametreleri (ör. sekme=paket) adreste de var. */
function isOnBoard(boardPath: string, pathname: string, search: string): boolean {
    const [boardPathname, boardQuery = ''] = boardPath.split('?');
    if (pathname !== boardPathname) return false;
    const current = new URLSearchParams(search);
    return [...new URLSearchParams(boardQuery)].every(([key, value]) => current.get(key) === value);
}

interface Props {
    /** Panonun adresi; "?siparis=<id>" eklenerek siparişin detayı açılır. */
    boardPath: string;
    /** Başlıktaki paket sesi düğmesinin görünürlüğü; dar barda gizlenip hesap menüsüne taşınır (AppShell). */
    soundToggleClassName?: string;
}

// Yeni online paket siparişi: kasiyer ve yönetici ekranlarında başlığın hemen altında tek uyarı şeridi ("N paket sipariş
// onay bekliyor", en acilin otomatik ret geri sayımıyla; kapatılabilir, panoya götürür) ve siparişi biri açana ya da
// kabul/ret edene kadar 10 sn'de bir tekrar eden ses. Başlıkta onay bekleyen sipariş sayısı (rozet) ve yanında ses
// açma/kapama düğmesi durur. Ses tercihi cihazda saklanır (lib/soundToggle); tarayıcı sesi ilk dokunuşa kadar kilitli
// tutabilir: o zaman "Sesi aç" düğmeli ayrı bir şerit görünür.
export default function OnlineOrderAlerts({ boardPath, soundToggleClassName }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const [enabled, setEnabled] = useState<boolean | null>(null);
    const [pending, setPending] = useState<DeliveryOrder[]>([]);
    const { newCount } = useNewOnlineOrderCounts();
    /** Ses çalınmış (bu cihazda "geldi" sayılmış) siparişler: yalnızca yeni gelen sipariş sesi tetikler. */
    const announced = useRef(new Set<string>());
    /** Şerit kapatıldığında bekleyen siparişler; bunların dışında yeni sipariş gelince şerit yeniden açılır. */
    const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(() => new Set());
    const soundState = useSyncExternalStore(onlineOrderSound.subscribe, onlineOrderSound.getState);

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

    // Görülmemiş yeni sipariş ilk kez listede belirince bir kez çalar (tekrar eden ses aşağıda).
    const announceArrivals = useCallback(() => {
        let arrived = false;
        for (const order of pending) {
            if (isOnlineOrderSeen(order.id) || announced.current.has(order.id)) continue;
            announced.current.add(order.id);
            arrived = true;
        }
        const waiting = new Set(pending.map(o => o.id));
        for (const id of [...announced.current]) if (!waiting.has(id)) announced.current.delete(id);
        if (arrived) playNewOnlineOrderSound();
    }, [pending]);

    useEffect(() => {
        announceArrivals();
        return subscribeNewOnlineOrders(announceArrivals);
    }, [announceArrivals]);

    // Onay bekleyen paket siparişler sekme başlığındaki bildirim sayısına katılır: "(2) …".
    useEffect(() => {
        setStaffAlertCount('online-orders', pending.length);
        return () => setStaffAlertCount('online-orders', 0);
    }, [pending.length]);

    // Görülmemiş yeni sipariş kaldıkça ses tekrar eder.
    useEffect(() => {
        const timer = setInterval(() => {
            if (pending.some(o => !isOnlineOrderSeen(o.id))) playNewOnlineOrderSound();
        }, REPEAT_MS);
        return () => clearInterval(timer);
    }, [pending]);

    const onBoard = isOnBoard(boardPath, location.pathname, location.search);
    // Şerit: panoda değilken, kapatıldığı andan sonra gelmiş bekleyen sipariş varsa (ya da hiç kapatılmadıysa).
    const showStrip = !onBoard && pending.length > 0 && pending.some(o => !dismissedIds.has(o.id));
    const dismissStrip = () => setDismissedIds(new Set(pending.map(o => o.id)));
    // Tercih açık ama tarayıcı sesi kilitli tutuyor: kullanıcı farkında değil, açık bir şeritle söylenir.
    // (Bilerek kapatılmış ses için şerit yok; yeni sipariş şeridinde küçük bir "ses kapalı" düğmesi durur.)
    const showSoundBanner = soundState === 'locked';

    // En acil (otomatik rete en yakın) sipariş: şeritte geri sayımı gösterilir.
    const urgent = useMemo(
        () => [...pending].sort((a, b) => (a.autoRejectAt ?? '9999').localeCompare(b.autoRejectAt ?? '9999'))[0] ?? null,
        [pending],
    );
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!showStrip) return;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [showStrip]);

    const goToBoard = () => {
        if (pending.length === 1) open(pending[0]);
        else navigate(boardPath);
    };

    if (enabled === false && newCount === 0) return null;

    const countdown = urgent?.autoRejectAt ? countdownText(urgent.autoRejectAt, now) : null;
    const stripContent = (showStrip || showSoundBanner) && (
        <div role="region" aria-label="Paket sipariş uyarıları" className="flex flex-col">
            {showStrip && urgent && (
                <div role="status" className="flex items-center gap-3 bg-rb-accent px-3 py-2.5 text-rb-accent-foreground sm:px-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
                        <BellRing className="h-4 w-4" />
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-snug">
                        <b>
                            {pending.length === 1
                                ? `Yeni paket siparişi ${orderTitle(urgent)} · ${formatAmount(urgent.total)} ₺.`
                                : `${pending.length} paket sipariş onay bekliyor.`}
                        </b>
                        {countdown && (
                            <span className="hidden sm:inline">
                                {' '}{pending.length === 1 ? '' : `#${urgent.number}, `}{countdown} sonra otomatik reddedilecek.
                            </span>
                        )}
                        {countdown && <span className="ml-1 font-bold tabular-nums sm:hidden">· ret {countdown}</span>}
                    </p>
                    {soundState === 'off' && (
                        <button
                            type="button"
                            data-online-order-sound-toggle
                            onClick={onlineOrderSound.toggle}
                            aria-label="Paket sipariş sesi kapalı, açmak için dokunun"
                            title="Ses kapalı · aç"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-white/20"
                        >
                            <VolumeX className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={goToBoard}
                        className="flex min-h-10 shrink-0 items-center rounded-lg bg-white px-3 text-sm font-bold text-rb-accent hover:opacity-90"
                    >
                        {pending.length === 1 ? 'Siparişi aç' : 'Siparişlere git'}
                    </button>
                    <button
                        type="button"
                        onClick={dismissStrip}
                        aria-label="Uyarıyı kapat"
                        title="Kapat (yeni sipariş gelince yeniden açılır)"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-white/20"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            )}
            {showSoundBanner && (
                <div role="alert" className="flex items-center gap-2 border-b border-rb-gold/40 bg-rb-gold-bg px-3 py-2 text-sm text-foreground sm:px-5">
                    <VolumeX className="h-4 w-4 shrink-0 text-rb-amber" aria-hidden="true" />
                    <p className="min-w-0 flex-1">Tarayıcı sesi kapalı tutuyor. Yeni paket siparişlerini duymak için sesi açın.</p>
                    <button
                        type="button"
                        data-online-order-sound-toggle
                        onClick={onlineOrderSound.toggle}
                        className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-rb-gold px-3 text-sm font-semibold text-rb-gold-foreground hover:opacity-90"
                    >
                        <Volume2 className="h-4 w-4" aria-hidden="true" />Sesi aç
                    </button>
                </div>
            )}
        </div>
    );
    // Şerit kabuğun başlığının hemen altındaki yuvaya yerleşir (sayfayı aşağı iter). Yuva yoksa (başka bir kabuk)
    // ekranın altında yüzen kutu olarak çıkar.
    const slot = typeof document !== 'undefined' ? document.getElementById(ONLINE_ORDER_STRIP_SLOT_ID) : null;
    const strips = stripContent && (slot
        ? createPortal(stripContent, slot)
        : createPortal(
            <div className="fixed inset-x-4 bottom-20 z-70 mx-auto max-w-xl overflow-hidden rounded-2xl shadow-xl md:bottom-6">{stripContent}</div>,
            document.body,
        ));

    return (
        <div className="flex items-center gap-1.5">
            {strips}
            <OnlineOrderSoundToggle className={soundToggleClassName} />
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

// Başlıktaki ses düğmesi: paket sipariş sesini açar/kapatır. Tarayıcı sesi kilitliyse dokunuş sesi açar.
function OnlineOrderSoundToggle({ className }: { className?: string }) {
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
                    : 'border-rb-gold/45 bg-rb-gold/15 text-rb-gold hover:bg-rb-gold/25',
                className
            )}
        >
            {on ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
        </button>
    );
}
