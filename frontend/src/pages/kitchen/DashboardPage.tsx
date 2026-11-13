import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderItem } from '@/features/orders/types';
import { orderService } from '@/features/orders/api/orderService';
import { categoryService } from '@/features/categories/api/categoryService';
import { userService } from '@/features/users/api/userService';
import HeaderStatCounter from '@/components/layout/HeaderStatCounter';
import { createHubConnection, getHubStatus, subscribeHubStatus } from '@/lib/signalrConnection';
import { getApiErrorMessage } from '@/lib/apiError';
import { buildTickets, isWaiting, ItemStatus, NEW_BAND_MS, type Ticket } from './kitchenTickets';
import { playKitchenChime } from './kitchenSound';
import TicketCard from './components/TicketCard';
import PassStrip from './components/PassStrip';

type LoadState = 'loading' | 'ready' | 'error';

const HUB_TEXT: Record<string, { text: string; cls: string }> = {
    connected: { text: 'bağlı', cls: 'text-(--kitchen-ok)' },
    idle: { text: 'bağlı', cls: 'text-(--kitchen-ok)' },
    connecting: { text: 'bağlanıyor', cls: 'text-(--kitchen-warn)' },
    reconnecting: { text: 'yeniden bağlanıyor', cls: 'text-(--kitchen-warn)' },
    disconnected: { text: 'kopuk', cls: 'text-(--kitchen-late)' },
};

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Ray değişince (yeni bilet soldan girince) eski biletler yeni yerlerine kayarak gider (FLIP: önceki konumdan
// transform ile başlatılıp sıfıra animasyon). Yeni bilet geldiyse ray en başa (sola) kaydırılır; diğer
// güncellemelerde (ürün hazır, bilet pasaya) kullanıcının elle kaydırdığı yere dokunulmaz.
function useRailMotion(railRef: RefObject<HTMLDivElement | null>, keys: string[], hasFreshTicket: boolean) {
    const prevLeftRef = useRef<Map<string, number>>(new Map());
    const prevKeysRef = useRef<Set<string> | null>(null);
    const keySig = keys.join('|');

    useLayoutEffect(() => {
        const rail = railRef.current;
        if (!rail) {
            prevLeftRef.current = new Map();
            prevKeysRef.current = new Set(keys);
            return;
        }
        const els = Array.from(rail.querySelectorAll<HTMLElement>('[data-ticket-key]'));
        const nextLeft = new Map<string, number>();
        for (const el of els) nextLeft.set(el.dataset.ticketKey!, el.offsetLeft);

        const prevKeys = prevKeysRef.current;
        const added = prevKeys !== null && keys.some(k => !prevKeys.has(k));
        const reduce = prefersReducedMotion();

        if (!reduce && prevKeys !== null) {
            for (const el of els) {
                const before = prevLeftRef.current.get(el.dataset.ticketKey!);
                const after = nextLeft.get(el.dataset.ticketKey!);
                if (before == null || after == null || before === after) continue;
                el.style.transition = 'none';
                el.style.transform = `translateX(${before - after}px)`;
                void el.offsetWidth; // yeniden akışı zorla: başlangıç konumu uygulansın
                el.style.transition = 'transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)';
                el.style.transform = '';
                // İçerideki süre çubuğunun transitionend'i de kabarcıklanır; yalnız kartın kendi transform'u bitince temizle.
                const done = (e: TransitionEvent) => {
                    if (e.target !== el || e.propertyName !== 'transform') return;
                    el.style.transition = '';
                    el.removeEventListener('transitionend', done);
                };
                el.addEventListener('transitionend', done);
            }
        }
        if (added && hasFreshTicket && rail.scrollLeft > 0) {
            rail.scrollTo({ left: 0, behavior: reduce ? 'auto' : 'smooth' });
        }

        prevLeftRef.current = nextLeft;
        prevKeysRef.current = new Set(keys);
        // keySig yalnız sıra/üyelik değişince tetikler; her saniyelik "now" render'ında değil.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keySig]);
}

// Mutfak ekranı — "bilet rayı + pasa". Rayda bu istasyonun bekleyen biletleri soldan (en yeni) sağa (en eski)
// dizilir; PASAYA ile bilet hazırlanmış olur ve alttaki pasaya iner; garson alınca "Alındı" ile ekrandan çıkar.
export default function KitchenDashboardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadState, setLoadState] = useState<LoadState>('loading');
    const [now, setNow] = useState(() => Date.now());
    // Ürünü ilk gördüğümüz an (id → ms). Açılışta ekranda olanlar 0 (yeni sayılmaz).
    const [seen, setSeen] = useState<Record<string, number>>({});
    const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(() => new Set());
    const [assignedCategoryNames, setAssignedCategoryNames] = useState<string[]>([]);
    const hubStatus = useSyncExternalStore(subscribeHubStatus, getHubStatus);

    const knownIdsRef = useRef<Set<string> | null>(null);
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Yeni listeyi uygular; önceden görmediğimiz bekleyen ürün geldiyse "yeni" işaretler ve ses çalar.
    const applyOrders = useCallback((next: Order[]) => {
        const at = Date.now();
        const firstLoad = knownIdsRef.current === null;
        const known = knownIdsRef.current ?? new Set<string>();
        const fresh: string[] = [];
        let freshWaiting = false;
        for (const order of next) {
            for (const item of order.orderItems) {
                const id = String(item.id);
                if (known.has(id)) continue;
                known.add(id);
                fresh.push(id);
                if (isWaiting(item)) freshWaiting = true;
            }
        }
        knownIdsRef.current = known;
        if (fresh.length > 0) {
            setSeen(prev => {
                const copy = { ...prev };
                for (const id of fresh) copy[id] = firstLoad ? 0 : at;
                return copy;
            });
        }
        if (!firstLoad && freshWaiting) playKitchenChime();
        setOrders(next);
        setLoadState('ready');
    }, []);

    const load = useCallback(() => {
        return orderService.getAllOrdersToKitchen().then(applyOrders);
    }, [applyOrders]);

    // SignalR olayları art arda gelebilir (her ürün güncellemesi bir olay); kısa bir beklemeyle tek istek at.
    const scheduleRefetch = useCallback(() => {
        if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = setTimeout(() => {
            refetchTimerRef.current = null;
            load().catch(() => {});
        }, 300);
    }, [load]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        load().catch(() => setLoadState('error'));
        Promise.all([categoryService.getCategories(), userService.getCurrentUser().catch(() => null)])
            .then(([categories, me]) => {
                const assigned = new Set(me?.categoryIds ?? []);
                setAssignedCategoryNames(assigned.size > 0 ? categories.filter(c => assigned.has(c.id)).map(c => c.name) : []);
            })
            .catch(console.error);
    }, [load]);

    useEffect(() => {
        const { connection: kitchenConn, stop: stopKitchenConn } = createHubConnection('/kitchen-hub');
        kitchenConn.on('ReceiveNewOrder', scheduleRefetch);

        const { connection: tableConn, stop: stopTableConn } = createHubConnection('/table-hub');
        tableConn.on('OrderUpdated', scheduleRefetch);
        tableConn.on('OrderClosed', (_tableId: number, closedOrderId: number) => {
            setOrders(prev => prev.filter(o => o.id !== closedOrderId));
        });

        let cancelled = false;
        kitchenConn.start().catch(err => { if (!cancelled) console.error('Kitchen SignalR:', err); });
        tableConn.start().catch(err => { if (!cancelled) console.error('Table SignalR:', err); });

        return () => {
            cancelled = true;
            if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
            stopKitchenConn();
            stopTableConn();
        };
    }, [scheduleRefetch]);

    const { rail, pass } = useMemo(() => buildTickets(orders, seen), [orders, seen]);
    const newTickets = rail.filter(t => t.seenAt > 0 && now - t.seenAt < NEW_BAND_MS);
    const railRef = useRef<HTMLDivElement>(null);
    useRailMotion(railRef, rail.map(t => t.key), newTickets.length > 0);

    /* ── Durum güncellemeleri: önce ekranda uygula, sonra sunucuya gönder; hata olursa listeyi yeniden çek ── */
    const setItemsStatus = async (ticket: Ticket, items: OrderItem[], status: number, failMessage: string) => {
        if (items.length === 0) return;
        const ids = new Set(items.map(i => i.id));
        setBusyKeys(prev => new Set(prev).add(ticket.key));
        setOrders(prev => prev.map(o => o.id !== ticket.order.id ? o : {
            ...o,
            orderItems: o.orderItems.map(i => ids.has(i.id) ? { ...i, status } : i),
        }));
        // Ürün ürün gönderilir: sunucu her birinde kategori yetkisini ayrıca denetler, sonradan eklenen ürünlere dokunulmaz.
        const results = await Promise.allSettled(items.map(i => orderService.updateOrderItemStatus(ticket.order.id, i.id, status)));
        setBusyKeys(prev => {
            const copy = new Set(prev);
            copy.delete(ticket.key);
            return copy;
        });
        const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
        if (failed) {
            toast.error(getApiErrorMessage(failed.reason, failMessage));
            load().catch(() => {});
        }
    };

    const handleToggleItem = (ticket: Ticket, item: OrderItem) =>
        setItemsStatus(ticket, [item], isWaiting(item) ? ItemStatus.Ready : ItemStatus.Pending, 'Ürün güncellenemedi. Tekrar deneyin.');
    const handlePass = (ticket: Ticket) =>
        setItemsStatus(ticket, ticket.items.filter(isWaiting), ItemStatus.Ready, 'Bilet pasaya gönderilemedi. Tekrar deneyin.');
    const handleTaken = (ticket: Ticket) =>
        setItemsStatus(ticket, ticket.items, ItemStatus.Served, 'Bilet kapatılamadı. Tekrar deneyin.');
    const handleUndo = (ticket: Ticket) =>
        setItemsStatus(ticket, ticket.items, ItemStatus.Pending, 'Bilet raya geri alınamadı. Tekrar deneyin.');

    const retryLoad = () => {
        setLoadState('loading');
        load().catch(() => setLoadState('error'));
    };

    const statsSlot = document.getElementById('kitchen-stats-slot');
    const hub = HUB_TEXT[hubStatus] ?? HUB_TEXT.connected;

    return (
        <>
            {statsSlot && createPortal(
                <>
                    {newTickets.length > 0 && (
                        <span className="mr-2 flex max-w-72 items-center gap-2 self-center rounded-lg bg-rb-gold px-3 py-1.5 text-sm font-bold text-rb-gold-foreground">
                            <Bell className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                            <span className="truncate">Yeni: {newTickets.map(t => t.order.tableName).join(', ')}</span>
                        </span>
                    )}
                    {assignedCategoryNames.length > 0 && (
                        <span
                            className="mr-1 max-w-64 truncate self-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-sidebar-foreground/70"
                            title="Size atanan kategoriler"
                        >
                            {assignedCategoryNames.join(' · ')}
                        </span>
                    )}
                    <HeaderStatCounter label="Rayda" count={rail.length} color="text-rb-gold" />
                    <HeaderStatCounter label="Pasada" count={pass.length} color="text-(--kitchen-ok-on-bar)" />
                </>,
                statsSlot
            )}

            <div className="flex min-h-0 flex-1 flex-col bg-[#E9E1D3] text-foreground dark:bg-sidebar dark:text-sidebar-foreground">
                <section aria-label="Bilet rayı, yeniden eskiye" className="flex min-h-0 flex-1 flex-col pt-3 sm:pt-4">
                    <div className="hidden items-center justify-between px-6 pb-2 text-xs font-bold tracking-[0.12em] text-rb-text-sub sm:flex">
                        <span>EN YENİ — yeni bilet soldan girer</span>
                        {assignedCategoryNames.length > 0 && (
                            <span className="truncate px-4 lg:hidden">{assignedCategoryNames.join(' · ').toLocaleUpperCase('tr')}</span>
                        )}
                        <span>EN ESKİ</span>
                    </div>
                    {/* Ray */}
                    <div aria-hidden="true" className="mx-2 h-3.5 shrink-0 rounded-full border-t-2 border-[#B8AC98] bg-[#CFC4B1] sm:mx-3 dark:border-[#5A4E3C] dark:bg-[#2A2318]" />

                    {loadState === 'loading' ? (
                        <p className="py-16 text-center text-lg font-semibold text-rb-text-sub">Yükleniyor...</p>
                    ) : loadState === 'error' ? (
                        <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
                            <p className="text-xl font-bold">Siparişler yüklenemedi.</p>
                            <p className="text-base text-rb-text-sub">Bağlantınızı kontrol edip tekrar deneyin.</p>
                            <button
                                type="button"
                                onClick={retryLoad}
                                className="h-12 rounded-xl border-2 border-rb-text-muted px-5 text-base font-semibold transition-colors hover:bg-white/5"
                            >
                                Tekrar dene
                            </button>
                        </div>
                    ) : rail.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-8 text-center">
                            <div aria-hidden="true" className="h-3.5 w-64 max-w-full rounded-full border-t-2 border-[#B8AC98] bg-[#CFC4B1] dark:border-[#5A4E3C] dark:bg-[#2A2318]" />
                            <p className="text-5xl font-bold tracking-[0.06em] sm:text-6xl">RAY BOŞ</p>
                            <p className="text-lg font-semibold text-rb-text-sub">
                                Yeni bilet soldan girer. Bağlantı: <span className={hub.cls}>{hub.text}</span>
                            </p>
                            {assignedCategoryNames.length > 0 && (
                                <p className="text-base font-semibold text-rb-text-sub">İstasyon: {assignedCategoryNames.join(' · ')}</p>
                            )}
                        </div>
                    ) : (
                        <div ref={railRef} className="kitchen-rail-scroll relative flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden px-3 pb-4 sm:gap-4 sm:px-6">
                            {rail.map(ticket => (
                                <TicketCard
                                    key={ticket.key}
                                    ticket={ticket}
                                    now={now}
                                    busy={busyKeys.has(ticket.key)}
                                    onToggleItem={handleToggleItem}
                                    onPass={handlePass}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <PassStrip tickets={pass} now={now} busyKeys={busyKeys} onTaken={handleTaken} onUndo={handleUndo} />
            </div>
        </>
    );
}
