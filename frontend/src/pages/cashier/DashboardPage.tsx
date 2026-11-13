import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { orderService } from '@/features/orders/api/orderService';
import { shiftService } from '@/features/cashier/api/shiftService';
import { tableService } from '@/features/tables/api/tableService';
import type { Order } from '@/features/orders/types';
import type { PaymentMethod, ShiftSummary, ShiftTransaction } from '@/features/cashier/types';
import type { Table } from '@/features/tables/types';
import PaymentPanel from './components/PaymentPanel';
import TransactionDetailPanel from './components/TransactionDetailPanel';
import TableTransferModal from '@/features/tables/components/TableTransferModal';
import HeaderStatCounter from '@/components/layout/HeaderStatCounter';
import { createHubConnection } from '@/lib/signalrConnection';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { formatAmount, formatElapsed } from '@/lib/format';

const OrderStatus = { Served: 5 } as const;

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'KART', 2: 'NAKİT', 3: 'QR', 4: 'IBAN' };
const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
    1: 'bg-rb-accent-bg text-rb-accent',
    2: 'bg-rb-green-bg text-rb-green',
    3: 'bg-rb-amber-bg text-rb-amber',
    4: 'bg-rb-purple-bg text-rb-purple',
};

function formatShortName(fullName: string): string {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export default function CashierDashboardPage() {
    const { shift } = useActiveShift();
    const [servedOrders, setServedOrders] = useState<Order[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [shiftTransactions, setShiftTransactions] = useState<ShiftTransaction[]>([]);
    const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<ShiftTransaction | null>(null);
    const [transferSourceOrder, setTransferSourceOrder] = useState<Order | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const refreshTransactions = () => {
        if (!shift) return;
        shiftService.getShiftTransactions(shift.id)
            .then(data => setShiftTransactions(data.slice(0, 10)))
            .catch(() => {});
        shiftService.getShiftSummary(shift.id)
            .then(setShiftSummary)
            .catch(() => {});
    };

    const loadOrders = () => {
        orderService.getAllOrdersToCashier()
            .then(orders => { setServedOrders(orders); setLoadFailed(false); })
            .catch(() => setLoadFailed(true));
    };

    useEffect(() => {
        loadOrders();
        tableService.getTables()
            .then(setTables)
            .catch(() => {});
        refreshTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shift]);

    useEffect(() => {
        // Keep the open detail panel in sync with the refreshed list (e.g. after a SignalR update).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedOrder(prev => {
            if (!prev) return prev;
            return servedOrders.find(o => o.id === prev.id) ?? null;
        });
    }, [servedOrders]);

    useEffect(() => {
        // Keep the open detail panel in sync with the refreshed list (e.g. after a SignalR update).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTransaction(prev => {
            if (!prev) return prev;
            return shiftTransactions.find(t => t.id === prev.id) ?? prev;
        });
    }, [shiftTransactions]);

    useEffect(() => {
        const { connection: conn, stop } = createHubConnection('/cashier-hub');

        conn.on('OrdersChanged', () => {
            orderService.getAllOrdersToCashier()
                .then(setServedOrders)
                .catch(() => {});
            tableService.getTables()
                .then(setTables)
                .catch(() => {});
            refreshTransactions();
        });

        let cancelled = false;
        conn.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; stop(); };
    }, []);

    const handlePaymentComplete = (orderId: number) => {
        setServedOrders(prev => prev.filter(o => o.id !== orderId));
        setSelectedOrder(null);
        refreshTransactions();
    };

    const shiftRevenue = shiftSummary?.total ?? 0;
    const shiftTransactionCount = shiftSummary?.transactionCount ?? 0;
    const shiftAvgTicket = shiftTransactionCount > 0 ? shiftRevenue / shiftTransactionCount : 0;
    // Kör sayım için kasadaki beklenen tutar gösterilmez; sadece bu vardiyada alınan nakit gösterilir.
    const cashCollected = shiftSummary?.breakdown.find(b => b.method === 2)?.amount ?? 0;

    const statsSlot = document.getElementById('cashier-stats-slot');

    return (
        <>
            {/* Header stats portal */}
            {statsSlot && createPortal(
                <>
                    <HeaderStatCounter label="Açık Masa" count={servedOrders.length} color="text-rb-amber" />
                    <HeaderStatCounter label="Bekleyen Ödeme" count={servedOrders.filter(o => o.status === OrderStatus.Served).length} color="text-rb-accent" />
                    <HeaderStatCounter label="Tamamlanan" count={shiftSummary?.transactionCount ?? 0} color="text-rb-green" />
                </>,
                statsSlot
            )}

            {/* Dark stats bar */}
            <div className="bg-sidebar px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-2 gap-y-3 gap-x-6 sm:flex sm:items-center sm:gap-8 shrink-0">
                <div>
                    <p className="text-lg font-serif font-bold text-sidebar-foreground">₺{formatAmount(shiftRevenue)}</p>
                    <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">Vardiya Cirosu</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/15" />
                <div>
                    <p className="text-lg font-serif font-bold text-sidebar-foreground">{shiftTransactionCount}</p>
                    <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">İşlem</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/15" />
                <div>
                    <p className="text-lg font-serif font-bold text-sidebar-foreground">₺{formatAmount(shiftAvgTicket)}</p>
                    <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">Ortalama</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/15" />
                <div>
                    <p className="text-lg font-serif font-bold text-rb-green">₺{formatAmount(cashCollected)}</p>
                    <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">Nakit Tahsilat</p>
                </div>
            </div>

            {/* İçerik */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
                {/* Sol: Ödeme bekleyen masalar */}
                <div className="lg:flex-1 lg:overflow-y-auto p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                            Ödeme Bekleyen Masalar
                        </h2>
                        {servedOrders.length > 0 && (
                            <span className="bg-rb-amber-bg text-rb-amber text-xs font-bold px-1.5 py-0.5 rounded">
                                {servedOrders.length}
                            </span>
                        )}
                    </div>

                    {loadFailed && servedOrders.length === 0 ? (
                        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rb-red/30 bg-rb-red-bg px-4 py-3">
                            <p className="text-sm text-foreground">Masalar yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
                            <button
                                type="button"
                                onClick={loadOrders}
                                className="h-11 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                Tekrar dene
                            </button>
                        </div>
                    ) : servedOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Açık masa yok.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* Garsonun "Hesap iste" dediği masalar önce, en eski istek en üstte. */}
                            {[...servedOrders].sort((a, b) =>
                                (a.billRequestedAt ? 0 : 1) - (b.billRequestedAt ? 0 : 1)
                                || (a.billRequestedAt ?? '').localeCompare(b.billRequestedAt ?? '')
                            ).map(order => (
                                <div
                                    key={order.id}
                                    className={`bg-card border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow ${order.billRequestedAt ? 'border-rb-accent/60 ring-1 ring-rb-accent/30' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-serif font-bold text-lg text-foreground">
                                            {order.tableName}
                                        </span>
                                        {order.billRequestedAt && (
                                            <span className="shrink-0 rounded-full bg-rb-accent-bg px-2 py-0.5 text-[11px] font-bold text-rb-accent">
                                                Hesap istendi · {formatElapsed(order.billRequestedAt, now)}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-2xl font-serif font-bold text-foreground">
                                        ₺{formatAmount(order.totalPrice)}
                                    </p>
                                    {(order.paidAmount ?? 0) > 0 && (
                                        <p className="-mt-2 text-sm font-semibold tabular-nums">
                                            <span className="text-rb-green">Ödenen ₺{formatAmount(order.paidAmount ?? 0)}</span>
                                            <span className="text-muted-foreground"> · </span>
                                            <span className="text-foreground">Kalan ₺{formatAmount(order.remainingAmount ?? order.totalPrice)}</span>
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{order.createdByUserName} · {formatElapsed(order.createdAt, now)}</span>
                                        <span>{order.orderItems.length} ürün</span>
                                    </div>

                                    {/* Masayı Taşı · Ödeme Al — admin masa paneliyle aynı sıra.
                                        "Siparişi İptal Et" kasiyer rolüne kapalı (/order/cancel). */}
                                    <div className="flex gap-2 mt-auto">
                                        <button
                                            onClick={() => setTransferSourceOrder(order)}
                                            className="flex-1 basis-0 min-w-0 min-h-12 px-2 border border-border hover:bg-muted text-foreground text-sm font-semibold leading-tight rounded-xl transition-colors"
                                        >
                                            Masayı Taşı
                                        </button>
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="flex-1 basis-0 min-w-0 min-h-12 px-2 bg-rb-gold hover:opacity-90 text-rb-gold-foreground text-sm font-semibold leading-tight rounded-xl transition-colors"
                                        >
                                            Ödeme Al
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sağ: Vardiya işlemleri */}
                <div className="lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l shrink-0 lg:overflow-y-auto p-4 sm:p-6">
                    <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-5">
                        Vardiya İşlemleri
                    </h2>

                    {shiftTransactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Bu vardiyada henüz işlem yok.</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {shiftTransactions.map(txn => {
                                const time = new Date(txn.createdAt)
                                    .toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div key={txn.id} className="py-3.5 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-muted-foreground bg-muted rounded-md px-2 py-1.5 shrink-0 tabular-nums">
                                                {time}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">
                                                    {txn.tableName || 'Masa —'}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {[formatShortName(txn.createdByUserName), `${txn.itemCount} ürün`].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PAYMENT_METHOD_COLORS[txn.method]}`}>
                                                    {PAYMENT_METHOD_LABELS[txn.method]}
                                                </span>
                                                <span className="text-base font-serif font-bold text-foreground">₺{formatAmount(txn.amount)}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedTransaction(txn)}
                                            className="mt-1 ml-13 min-h-9 text-xs font-medium text-rb-accent hover:underline"
                                        >
                                            Detayı gör
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Ödeme paneli overlay */}
            {selectedOrder && (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[3px] animate-in fade-in duration-200"
                        onClick={() => setSelectedOrder(null)}
                    />
                    <div className="fixed top-0 right-0 bottom-0 z-30 w-full sm:w-190 bg-[#FFFDF8] dark:bg-[#1C1712] border-l border-border shadow-[0_24px_64px_rgba(0,0,0,0.35)] animate-in slide-in-from-right duration-300">
                        <PaymentPanel
                            order={selectedOrder}
                            onClose={() => setSelectedOrder(null)}
                            onComplete={handlePaymentComplete}
                        />
                    </div>
                </>
            )}

            {/* İşlem detay paneli overlay */}
            {selectedTransaction && (
                <>
                    <div
                        className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[3px] animate-in fade-in duration-200"
                        onClick={() => setSelectedTransaction(null)}
                    />
                    <div className="fixed top-0 right-0 bottom-0 z-30 w-full sm:w-110 bg-[#FFFDF8] dark:bg-[#1C1712] border-l border-border shadow-[0_24px_64px_rgba(0,0,0,0.35)] animate-in slide-in-from-right duration-300">
                        <TransactionDetailPanel
                            transaction={selectedTransaction}
                            onClose={() => setSelectedTransaction(null)}
                        />
                    </div>
                </>
            )}

            {/* Masayı Taşı modalı */}
            {transferSourceOrder && (() => {
                const sourceTable = tables.find(t => t.id === transferSourceOrder.tableId);
                if (!sourceTable) return null;
                return (
                    <TableTransferModal
                        sourceTable={sourceTable}
                        tables={tables}
                        onClose={() => setTransferSourceOrder(null)}
                        onDone={async () => {
                            setTransferSourceOrder(null);
                            await orderService.getAllOrdersToCashier().then(setServedOrders).catch(() => {});
                            await tableService.getTables().then(setTables).catch(() => {});
                        }}
                    />
                );
            })()}
        </>
    );
}
