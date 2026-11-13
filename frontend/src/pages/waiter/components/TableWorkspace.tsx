import { useCallback, useEffect, useState } from 'react';
import {
    AlertCircle, ArrowRightLeft, CalendarDays, ChevronLeft, Clock, CreditCard, Gift, MoreHorizontal, Percent, Plus,
    ReceiptText, Undo2, X, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { orderService } from '@/features/orders/api/orderService';
import { tableService } from '@/features/tables/api/tableService';
import type { Order, OrderItem } from '@/features/orders/types';
import type { Reservation, Table } from '@/features/tables/types';
import type { WaiterPermissions } from '@/features/users/types';
import { createHubConnection } from '@/lib/signalrConnection';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatMinutes, formatPrice, prepCountdown } from '@/lib/format';
import { cn } from '@/lib/utils';
import AddItemsView from './AddItemsView';
import PaymentView, { type PaymentMode } from './PaymentView';
import MoveTableView from './MoveTableView';
import BottomSheet, { SheetItem } from './BottomSheet';
import { STATE_STYLE, clockTime, minutesSince, tableState } from '../waiterUi';

export type WorkspaceView = 'detail' | 'add' | 'pay' | 'move' | 'reserve';

interface Props {
    table: Table;
    tables: Table[];
    permissions: WaiterPermissions;
    /** screen: telefonda tam ekran · panel: tablette sağ panel. */
    variant: 'screen' | 'panel';
    initialView?: WorkspaceView;
    now: number;
    onClose: () => void;
    onTablePatch: (tableId: string, patch: Partial<Table>) => void;
    onRefreshTables: () => void;
}

const GROUPS: { status: number; title: string; dot: string }[] = [
    { status: 3, title: 'Hazır · servis bekliyor', dot: 'bg-rb-green' },
    { status: 2, title: 'Hazırlanıyor', dot: 'bg-rb-orange' },
    { status: 1, title: 'Bekliyor', dot: 'bg-rb-text-muted' },
    { status: 4, title: 'Servis edildi', dot: 'bg-rb-text-muted' },
];

function formatTimeDigits(raw: string): string {
    let digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 1 && Number(digits[0]) > 2) digits = '2' + digits.slice(1);
    if (digits.length >= 2 && digits[0] === '2' && Number(digits[1]) > 3) digits = digits[0] + '3' + digits.slice(2);
    if (digits.length >= 3 && Number(digits[2]) > 5) digits = digits.slice(0, 2) + '5' + digits.slice(3);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

function itemSubline(item: OrderItem, now: number): { text: string; late: boolean } {
    const note = item.note ? ` · "${item.note}"` : '';
    if (item.status === 3) return { text: `Hazır${note}`, late: false };
    if (item.status === 4) return { text: `Servis edildi${note}`, late: false };
    const countdown = prepCountdown(item.createdAt, item.prepMinutes, now);
    const base = item.status === 1 ? 'Mutfağa iletildi' : 'Hazırlanıyor';
    if (!countdown) return { text: `${base}${note}`, late: false };
    return countdown.overdue
        ? { text: `${countdown.minutes > 0 ? `${formatMinutes(countdown.minutes)} gecikti` : 'süre doldu'}${note}`, late: true }
        : { text: `${base} · ~${formatMinutes(countdown.minutes)} kaldı${note}`, late: false };
}

// Bir masanın garson tarafı: detay + ürün ekleme + ödeme + taşıma + rezervasyon. Telefonda tam ekran,
// tablette sağ panelde açılır. Yetkisi olmayan işlem hiç çizilmez.
export default function TableWorkspace({
    table, tables, permissions, variant, initialView = 'detail', now, onClose, onTablePatch, onRefreshTables,
}: Props) {
    const { canTakeOrders, canTakePayment, canCancelAndDiscount, canTransferAndReserve } = permissions;
    const [view, setView] = useState<WorkspaceView>(initialView);
    // Boş masa doğrudan ürün eklemeyle açıldıysa "geri" masa listesine döner (telefonda ızgara,
    // tablette panel kapanır); sipariş gönderilince normal detay akışına geçilir.
    const [openedOnAdd, setOpenedOnAdd] = useState(initialView === 'add');
    const [payMode, setPayMode] = useState<PaymentMode>('normal');
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [confirm, setConfirm] = useState<'cancel-order' | 'cancel-reservation' | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [resName, setResName] = useState('');
    const [resContact, setResContact] = useState('');
    const [resTime, setResTime] = useState('');
    const [resNote, setResNote] = useState('');

    const loadOrder = useCallback(async () => {
        try {
            const data = await orderService.getOrderByTableId(String(table.id));
            setOrder(data || null);
        } catch {
            setOrder(null);
        }
    }, [table.id]);

    useEffect(() => {
        // Masa değişince üst bileşen bu paneli key ile yeniden kurar; durum burada sıfırlanmaz.
        let cancelled = false;
        orderService.getOrderByTableId(String(table.id))
            .then(data => { if (!cancelled) setOrder(data || null); })
            .catch(() => { if (!cancelled) setOrder(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [table.id]);

    useEffect(() => {
        if (table.status !== 3) return;
        tableService.getActiveReservation(String(table.id)).then(setReservation).catch(() => setReservation(null));
    }, [table.id, table.status]);

    useEffect(() => {
        const { connection, stop } = createHubConnection('/table-hub');
        const mine = (id: string) => id === table.id;
        connection.on('OrderUpdated', (id: string) => { if (mine(id)) void loadOrder(); });
        connection.on('BillRequestChanged', (id: string) => { if (mine(id)) void loadOrder(); });
        connection.on('OrderClosed', (id: string) => { if (mine(id)) setOrder(null); });
        let cancelled = false;
        connection.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, [table.id, loadOrder]);

    const state = tableState({ status: order ? 2 : table.status, billRequestedAt: order?.billRequestedAt ?? null });
    const style = STATE_STYLE[state];
    const hasItems = !!order && order.orderItems.length > 0;
    const itemCount = order?.orderItems.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
    const total = order?.totalPrice ?? 0;
    // Tutar girerek alınmış ödemeler düşülünce masada kalan.
    const paidOnAccount = order?.paidAmount ?? 0;
    const due = order?.remainingAmount ?? total;
    const billRequested = !!order?.billRequestedAt;

    const run = async (key: string, action: () => Promise<void>, fallback: string) => {
        if (busy) return;
        setBusy(key);
        try { await action(); } catch (err) { toast.error(getApiErrorMessage(err, fallback)); } finally { setBusy(null); }
    };

    const requestBill = (cancel = false) => run('bill', async () => {
        if (!order) return;
        await orderService.requestBill(order.id, cancel);
        const at = cancel ? null : (order.billRequestedAt ?? new Date().toISOString());
        setOrder(prev => prev ? { ...prev, billRequestedAt: at } : prev);
        onTablePatch(table.id, { billRequestedAt: at });
        toast.success(cancel ? 'Hesap isteği geri alındı.' : 'Hesap istendi, kasaya bildirildi.');
    }, 'Hesap istenemedi.');

    const serveItem = (item: OrderItem) => run(`serve-${item.id}`, async () => {
        if (!order) return;
        await orderService.updateOrderItemStatus(order.id, item.id, 4);
        setOrder(prev => prev ? { ...prev, orderItems: prev.orderItems.map(i => i.id === item.id ? { ...i, status: 4 } : i) } : prev);
    }, 'Servis edildi olarak işaretlenemedi.');

    const serveAll = () => run('serve-all', async () => {
        if (!order) return;
        await orderService.updateOrderStatus(order.id, 5);
        setOrder(prev => prev ? { ...prev, orderItems: prev.orderItems.map(i => i.status === 3 ? { ...i, status: 4 } : i) } : prev);
    }, 'Servis edilemedi.');

    const commitNote = async (item: OrderItem) => {
        setEditingNoteId(null);
        if (!order || noteDraft === item.note) return;
        try {
            await orderService.updateOrderItemNote(order.id, item.id, noteDraft);
            setOrder(prev => prev ? { ...prev, orderItems: prev.orderItems.map(i => i.id === item.id ? { ...i, note: noteDraft } : i) } : prev);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Not güncellenemedi.'));
        }
    };

    const cancelOrder = () => run('cancel', async () => {
        if (!order) return;
        await orderService.cancelOrder(order.id);
        onTablePatch(table.id, { status: 1, billRequestedAt: null, activeOrderTotal: 0, occupiedSince: null });
        toast.success('Sipariş iptal edildi.');
        onClose();
    }, 'Sipariş iptal edilemedi.');

    const customerArrived = () => run('arrive', async () => {
        await tableService.cancelReservation(String(table.id));
        await tableService.openTable(String(table.id));
        onTablePatch(table.id, { status: 2, occupiedSince: new Date().toISOString() });
        await loadOrder();
        toast.success('Masa açıldı, müşteri karşılandı.');
        if (canTakeOrders) setView('add');
    }, 'Masa açılamadı.');

    const cancelReservation = () => run('cancel-res', async () => {
        await tableService.cancelReservation(String(table.id));
        onTablePatch(table.id, { status: 1 });
        toast.success('Rezervasyon iptal edildi.');
        onClose();
    }, 'Rezervasyon iptal edilemedi.');

    const saveReservation = () => {
        if (!resName.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(resTime)) {
            toast.error('Ad soyad ve SS:DD biçiminde saat girin (ör. 19:30).');
            return;
        }
        void run('reserve', async () => {
            await tableService.reservationTable(String(table.id), resName.trim(), resContact, resTime, resNote);
            onTablePatch(table.id, { status: 3 });
            toast.success('Rezervasyon kaydedildi.');
            onClose();
        }, 'Rezervasyon kaydedilemedi.');
    };

    const openPay = (mode: PaymentMode) => { setPayMode(mode); setSheetOpen(false); setView('pay'); };

    // ── Alt ekranlar ──
    if (view === 'add' && canTakeOrders) {
        const backToList = openedOnAdd && !order;
        return (
            <AddItemsView
                table={table}
                order={order}
                backLabel={backToList ? 'Masalara dön' : undefined}
                onBack={() => (backToList ? onClose() : setView('detail'))}
                onReserve={backToList && canTransferAndReserve && table.status === 1
                    ? () => { setOpenedOnAdd(false); setView('reserve'); }
                    : undefined}
                onTableOpened={() => onTablePatch(table.id, { status: 2, occupiedSince: new Date().toISOString() })}
                onSent={() => { setOpenedOnAdd(false); void loadOrder(); onRefreshTables(); setView('detail'); }}
            />
        );
    }
    if (view === 'pay' && order && hasItems && canTakePayment) {
        return (
            <PaymentView
                table={table}
                order={order}
                mode={payMode}
                canDiscount={canCancelAndDiscount}
                onBack={() => setView('detail')}
                onRequestBill={() => void requestBill(false)}
                onPaid={fullyPaid => {
                    onRefreshTables();
                    if (fullyPaid) {
                        onTablePatch(table.id, { status: 1, billRequestedAt: null, activeOrderTotal: 0, occupiedSince: null });
                        onClose();
                    } else {
                        void loadOrder();
                    }
                }}
            />
        );
    }
    if (view === 'move' && order && canTransferAndReserve) {
        return (
            <MoveTableView
                table={table}
                order={order}
                tables={tables}
                onBack={() => setView('detail')}
                onDone={() => { onRefreshTables(); onClose(); }}
            />
        );
    }

    // ── Detay ──
    const minutes = order ? minutesSince(order.createdAt, now) : null;
    const overdueItems = order?.orderItems.filter(i => (i.status === 1 || i.status === 2) && prepCountdown(i.createdAt, i.prepMinutes, now)?.overdue) ?? [];
    const canReserve = canTransferAndReserve && !order && table.status === 1;
    const moreItems = [
        hasItems && canTakePayment && canCancelAndDiscount && 'ikram',
        hasItems && canTakePayment && canCancelAndDiscount && 'discount',
        hasItems && (canTakePayment || billRequested) && 'bill',
        canReserve && 'reserve',
        // Tutar girerek ödeme alınmış hesap iptal edilemez (sunucu da reddeder).
        !!order && canCancelAndDiscount && paidOnAccount === 0 && 'cancel',
    ].filter(Boolean) as string[];
    const showAdd = canTakeOrders && table.status !== 3;
    const showMove = canTransferAndReserve && !!order;
    const showMore = moreItems.length > 0 && view !== 'reserve';
    const rowCols = [showAdd && '1fr', showMove && '1fr', showMore && '56px'].filter(Boolean).join(' ');

    return (
        <div className="relative flex h-full min-h-0 flex-col bg-[#F5F0E8] dark:bg-background">
            <header className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-2">
                {variant === 'screen' || view === 'reserve' ? (
                    <button
                        type="button"
                        onClick={() => (view === 'reserve' ? setView('detail') : onClose())}
                        aria-label={view === 'reserve' ? `${table.name} masasına dön` : 'Masalara dön'}
                        className="-ml-2 flex size-12 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted"
                    >
                        <ChevronLeft className="size-6" aria-hidden="true" />
                    </button>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="truncate font-serif text-[30px] font-bold leading-none text-foreground">
                        {view === 'reserve' ? 'Rezervasyon' : table.name}
                    </h2>
                    <span className="mt-1 flex items-center gap-1 truncate text-[13px] font-medium text-rb-text-sub">
                        {view === 'reserve' ? `${table.name} · ${table.regionName}` : (
                            <>
                                {table.regionName}
                                {order && <> · açılış {clockTime(order.createdAt)} · <Clock className="size-3.5" aria-hidden="true" />{formatMinutes(minutes ?? 0)}</>}
                            </>
                        )}
                    </span>
                </div>
                {view !== 'reserve' && (
                    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', style.pill)}>
                        <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden="true" />{style.label}
                    </span>
                )}
                {variant === 'panel' && view !== 'reserve' && (
                    <button type="button" onClick={onClose} aria-label="Paneli kapat" className="flex size-11 shrink-0 items-center justify-center rounded-full text-rb-text-sub hover:bg-muted">
                        <X className="size-5" aria-hidden="true" />
                    </button>
                )}
            </header>

            <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1 pb-4 *:shrink-0">
                {loading ? (
                    <div className="flex flex-col gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div>
                ) : view === 'reserve' ? (
                    <div className="flex flex-col gap-3">
                        <p className="rounded-2xl bg-rb-amber-bg px-4 py-3 text-sm text-foreground">Masa seçilen saat için ayrılır ve durumu "Rezerve" olur.</p>
                        {([
                            ['Ad soyad', resName, setResName, 'Misafir adı', 'text'],
                            ['Telefon', resContact, setResContact, '05xx xxx xx xx', 'tel'],
                        ] as const).map(([label, value, set, placeholder, type]) => (
                            <label key={label} className="flex flex-col gap-1.5">
                                <span className="text-[13px] font-semibold text-rb-text-sub">{label}</span>
                                <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                                    className="h-12 rounded-2xl border border-border bg-card px-3.5 text-base outline-none focus:ring-2 focus:ring-rb-gold" />
                            </label>
                        ))}
                        <label className="flex flex-col gap-1.5">
                            <span className="text-[13px] font-semibold text-rb-text-sub">Saat</span>
                            <input inputMode="numeric" maxLength={5} value={resTime} onChange={e => setResTime(formatTimeDigits(e.target.value))} placeholder="19:30"
                                className="h-12 rounded-2xl border border-border bg-card px-3.5 text-base outline-none focus:ring-2 focus:ring-rb-gold" />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-[13px] font-semibold text-rb-text-sub">Not (isteğe bağlı)</span>
                            <input value={resNote} onChange={e => setResNote(e.target.value)} placeholder="Doğum günü, özel istek…"
                                className="h-12 rounded-2xl border border-border bg-card px-3.5 text-base outline-none focus:ring-2 focus:ring-rb-gold" />
                        </label>
                    </div>
                ) : table.status === 3 && !order ? (
                    <div className="flex flex-col gap-3">
                        <div className="rounded-2xl border border-rb-amber/35 bg-rb-amber-bg p-4">
                            <p className="text-xs font-bold tracking-widest text-rb-amber uppercase">Rezervasyon</p>
                            {reservation ? (
                                <>
                                    <p className="mt-1 font-serif text-[26px] font-bold text-foreground">
                                        {new Date(reservation.reservationTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · {reservation.guestName || '—'}
                                    </p>
                                    {reservation.contact && <p className="text-sm text-rb-text-sub">{reservation.contact}</p>}
                                    {reservation.note && <p className="mt-1 text-sm text-foreground">Not: {reservation.note}</p>}
                                </>
                            ) : <p className="mt-1 text-sm text-rb-text-sub">Bu rezervasyon için detay girilmemiş.</p>}
                        </div>
                        {canTransferAndReserve && canTakeOrders && (
                            <button type="button" onClick={customerArrived} disabled={!!busy}
                                className="h-14 rounded-2xl bg-rb-green text-base font-bold text-rb-green-foreground disabled:opacity-60">
                                {busy === 'arrive' ? 'Açılıyor…' : 'Müşteri geldi · masayı aç'}
                            </button>
                        )}
                        {canTransferAndReserve ? (
                            <button type="button" onClick={() => setConfirm('cancel-reservation')} disabled={!!busy}
                                className="h-13 rounded-2xl border border-rb-red/40 text-base font-semibold text-rb-red disabled:opacity-60">
                                Rezervasyonu iptal et
                            </button>
                        ) : <p className="text-center text-sm text-rb-text-sub">Rezervasyon işlemleri için yetkiniz yok.</p>}
                    </div>
                ) : !hasItems ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-10 text-center">
                        <span className="font-serif text-[24px] font-bold text-foreground">{order ? 'Henüz ürün yok' : 'Masa boş'}</span>
                        <span className="text-sm text-rb-text-sub">
                            {canTakeOrders ? '"Sipariş ekle" ile masayı açın.' : 'Bu masada sipariş açma yetkiniz yok.'}
                        </span>
                    </div>
                ) : (
                    <>
                        {overdueItems.length > 0 && (
                            <div role="status" className="flex items-center gap-2.5 rounded-2xl bg-rb-red-bg px-3.5 py-3 text-[15px] font-semibold text-rb-red">
                                <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
                                <span>
                                    {overdueItems.length === 1
                                        ? `${overdueItems[0].productName} ${itemSubline(overdueItems[0], now).text.split(' · ')[0]}`
                                        : `${overdueItems.length} ürün hazırlanma süresini aştı`}
                                </span>
                            </div>
                        )}
                        {order?.note && (
                            <p className="rounded-2xl bg-rb-amber-bg px-3.5 py-2.5 text-sm text-foreground"><span className="font-bold">Not: </span>{order.note}</p>
                        )}
                        {GROUPS.map(group => {
                            const items = order!.orderItems.filter(i => i.status === group.status);
                            if (items.length === 0) return null;
                            return (
                                <section key={group.status} className="flex flex-col gap-1.5">
                                    <h3 className="flex items-center gap-2 px-1 text-[13px] font-bold text-rb-text-sub">
                                        <span className={cn('size-2 rounded-full', group.dot)} aria-hidden="true" />
                                        {group.title} <span className="font-medium">· {items.length}</span>
                                        {group.status === 3 && items.length > 1 && (
                                            <button type="button" onClick={serveAll} disabled={!!busy} className="ml-auto min-h-9 rounded-full px-3 text-[13px] font-bold text-rb-green hover:bg-rb-green-bg">
                                                Tümünü servis et
                                            </button>
                                        )}
                                    </h3>
                                    <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                                        {items.map((item, idx) => {
                                            const sub = itemSubline(item, now);
                                            return (
                                                <li key={item.id} className={cn('flex min-h-16 items-center gap-3 px-3 py-2.5', idx > 0 && 'border-t border-border', group.status === 4 && 'opacity-70')}>
                                                    <span className="w-7 shrink-0 text-base font-bold tabular-nums text-foreground">{item.quantity}×</span>
                                                    <div
                                                        className={cn('flex min-w-0 flex-1 flex-col', canTakeOrders && 'cursor-text')}
                                                        onClick={() => { if (canTakeOrders && editingNoteId !== item.id) { setEditingNoteId(item.id); setNoteDraft(item.note); } }}
                                                    >
                                                        <span className="truncate text-base font-semibold text-foreground">{item.productName}</span>
                                                        {editingNoteId === item.id ? (
                                                            <input
                                                                autoFocus
                                                                value={noteDraft}
                                                                onChange={e => setNoteDraft(e.target.value)}
                                                                onBlur={() => void commitNote(item)}
                                                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                                placeholder="Ürün notu"
                                                                aria-label={`${item.productName} notu`}
                                                                className="mt-1 h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-rb-gold"
                                                            />
                                                        ) : (
                                                            <span className={cn('truncate text-[13px]', sub.late ? 'font-semibold text-rb-red' : 'text-rb-text-sub')}>{sub.text}</span>
                                                        )}
                                                    </div>
                                                    {group.status === 3 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => serveItem(item)}
                                                            disabled={busy === `serve-${item.id}`}
                                                            className="min-h-11 shrink-0 rounded-xl bg-rb-green px-3.5 text-sm font-bold text-rb-green-foreground disabled:opacity-60"
                                                        >
                                                            {busy === `serve-${item.id}` ? '…' : 'Servis et'}
                                                        </button>
                                                    ) : (
                                                        <span className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">₺{formatPrice(item.unitPrice * item.quantity)}</span>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            );
                        })}
                        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-3">
                            <div className="flex justify-between text-[13px] text-rb-text-sub">
                                <span>{itemCount} ürün</span>
                                {billRequested && order?.billRequestedAt && <span className="font-semibold text-rb-accent">Hesap istendi · {clockTime(order.billRequestedAt)}</span>}
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="text-base font-semibold text-foreground">Toplam</span>
                                <span className="text-[24px] font-bold tabular-nums text-foreground">₺{formatPrice(total)}</span>
                            </div>
                            {paidOnAccount > 0 && (
                                <div className="flex items-baseline justify-between border-t border-border pt-1.5 text-[15px]">
                                    <span className="font-semibold text-rb-green">Ödenen ₺{formatPrice(paidOnAccount)}</span>
                                    <span className="font-bold tabular-nums text-foreground">Kalan ₺{formatPrice(due)}</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Aksiyon çubuğu */}
            {!loading && (
                <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
                    {view === 'reserve' ? (
                        <button type="button" onClick={saveReservation} disabled={!!busy} className="h-15 rounded-2xl bg-foreground text-[17px] font-bold text-background disabled:opacity-60">
                            {busy === 'reserve' ? 'Kaydediliyor…' : 'Rezervasyonu kaydet'}
                        </button>
                    ) : (
                        <>
                            {rowCols && (
                                <div className="grid gap-2" style={{ gridTemplateColumns: rowCols }}>
                                    {showAdd && (
                                        <button type="button" onClick={() => setView('add')} className="flex h-13 items-center justify-center gap-1.5 rounded-2xl border border-border bg-background text-[15px] font-bold text-foreground">
                                            <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />Sipariş ekle
                                        </button>
                                    )}
                                    {showMove && (
                                        <button type="button" onClick={() => setView('move')} className="flex h-13 items-center justify-center gap-1.5 rounded-2xl border border-border bg-background text-[15px] font-bold text-foreground">
                                            <ArrowRightLeft className="size-5" aria-hidden="true" />Masa taşı
                                        </button>
                                    )}
                                    {showMore && (
                                        <button type="button" onClick={() => setSheetOpen(true)} aria-label="Diğer işlemler" aria-expanded={sheetOpen}
                                            className="flex h-13 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                                            <MoreHorizontal className="size-6" aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            )}
                            {hasItems && (canTakePayment ? (
                                <button type="button" onClick={() => openPay('normal')} className="flex h-16 items-center justify-between rounded-2xl bg-foreground px-5 text-background">
                                    <span className="flex items-center gap-2.5 text-[17px] font-bold"><CreditCard className="size-5.5 text-rb-gold" aria-hidden="true" />Ödeme al</span>
                                    <span className="text-xl font-bold tabular-nums">{paidOnAccount > 0 && <span className="mr-1 text-[13px] font-semibold opacity-70">kalan</span>}₺{formatPrice(due)}</span>
                                </button>
                            ) : (
                                <button type="button" onClick={() => void requestBill(false)} disabled={busy === 'bill'}
                                    className={cn('flex h-16 items-center justify-between rounded-2xl px-5 disabled:opacity-60',
                                        billRequested ? 'border-[1.5px] border-rb-accent bg-rb-accent-bg text-rb-accent' : 'bg-foreground text-background')}>
                                    <span className="flex flex-col items-start">
                                        <span className="flex items-center gap-2.5 text-[17px] font-bold"><ReceiptText className="size-5.5" aria-hidden="true" />{billRequested ? 'Hesap istendi' : 'Hesap iste'}</span>
                                        {billRequested && <span className="text-[12px] font-medium opacity-80">Kasaya yeniden bildirmek için dokunun</span>}
                                    </span>
                                    <span className="text-xl font-bold tabular-nums">₺{formatPrice(due)}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}

            {sheetOpen && (
                <BottomSheet label="Diğer işlemler" onClose={() => setSheetOpen(false)}>
                    {moreItems.includes('ikram') && (
                        <SheetItem icon={<Gift className="size-5.5" />} title="İkram et" hint="Seçili ürünleri ücretsiz say" onClick={() => openPay('ikram')} />
                    )}
                    {moreItems.includes('discount') && (
                        <SheetItem icon={<Percent className="size-5.5" />} title="İndirim uygula" hint="Ödeme alırken yüzde ya da tutar" onClick={() => openPay('discount')} />
                    )}
                    {moreItems.includes('bill') && (billRequested ? (
                        <SheetItem icon={<Undo2 className="size-5.5" />} title="Hesap isteğini geri al" hint="Masa yeniden 'Dolu' görünür" onClick={() => { setSheetOpen(false); void requestBill(true); }} />
                    ) : (
                        <SheetItem icon={<ReceiptText className="size-5.5" />} title="Hesap iste" hint='Masayı "hesap istendi" işaretle, kasaya bildir' onClick={() => { setSheetOpen(false); void requestBill(false); }} />
                    ))}
                    {moreItems.includes('reserve') && (
                        <SheetItem icon={<CalendarDays className="size-5.5" />} title="Rezervasyon" hint="Masayı bir saat için ayır" onClick={() => { setSheetOpen(false); setView('reserve'); }} />
                    )}
                    {moreItems.includes('cancel') && (
                        <>
                            <div className="mx-3 my-1 h-px bg-border" />
                            <SheetItem icon={<XCircle className="size-5.5" />} title="Siparişi iptal et" danger onClick={() => { setSheetOpen(false); setConfirm('cancel-order'); }} />
                        </>
                    )}
                </BottomSheet>
            )}

            <AlertDialog open={confirm !== null} onOpenChange={open => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm === 'cancel-reservation' ? 'Rezervasyonu iptal et' : 'Siparişi iptal et'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm === 'cancel-reservation'
                                ? 'Bu masanın rezervasyonu iptal edilecek ve masa boşa çıkacak. Emin misiniz?'
                                : `${table.name} masasının siparişinin tamamı iptal edilecek ve masa boşaltılacak. Bu işlem geri alınamaz.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                        <AlertDialogAction variant="danger" onClick={() => (confirm === 'cancel-reservation' ? void cancelReservation() : void cancelOrder())}>
                            {confirm === 'cancel-reservation' ? 'Rezervasyonu iptal et' : 'Siparişi iptal et'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
