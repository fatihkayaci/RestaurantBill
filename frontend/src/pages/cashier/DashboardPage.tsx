import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { orderService } from '@/features/orders/api/orderService';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import { shiftService } from '@/features/cashier/api/shiftService';
import type { Order } from '@/features/orders/types';
import type { PaymentMethod, ShiftTransaction } from '@/features/cashier/types';
import PaymentPanel from './components/PaymentPanel';
import TransactionDetailPanel from './components/TransactionDetailPanel';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'KART', 2: 'NAKİT', 3: 'QR' };
const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
    1: 'bg-rb-accent-bg text-rb-accent',
    2: 'bg-rb-green-bg text-rb-green',
    3: 'bg-rb-amber-bg text-rb-amber',
};

function formatElapsed(createdAt: string, now: number): string {
    const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}s ${remainingMinutes}dk` : `${remainingMinutes}dk`;
}

function formatShortName(fullName: string): string {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export default function CashierDashboardPage() {
    const [servedOrders, setServedOrders] = useState<Order[]>([]);
    const [shiftTransactions, setShiftTransactions] = useState<ShiftTransaction[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [completedRevenue, setCompletedRevenue] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<ShiftTransaction | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const refreshTransactions = () => {
        cashRegisterService.getTransactions()
            .then(data => {
                const income = data.filter(t => t.type === 1);
                setCompletedCount(income.length);
                setCompletedRevenue(income.reduce((s, t) => s + t.amount, 0));
            })
            .catch(() => {});
        shiftService.getMyCurrentTransactions()
            .then(data => setShiftTransactions(data.slice(0, 10)))
            .catch(() => {});
    };

    useEffect(() => {
        orderService.getAllOrdersToCashier()
            .then(setServedOrders)
            .catch(() => {});
        refreshTransactions();
    }, []);

    useEffect(() => {
        setSelectedOrder(prev => {
            if (!prev) return prev;
            return servedOrders.find(o => o.id === prev.id) ?? null;
        });
    }, [servedOrders]);

    useEffect(() => {
        setSelectedTransaction(prev => {
            if (!prev) return prev;
            return shiftTransactions.find(t => t.id === prev.id) ?? prev;
        });
    }, [shiftTransactions]);

    useEffect(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/cashier-hub`, {
                accessTokenFactory: () => localStorage.getItem('token') ?? '',
            })
            .withAutomaticReconnect()
            .configureLogging({
                log(level: signalR.LogLevel, msg: string) {
                    if (msg.includes('stopped during negotiation')) return;
                    if (level >= signalR.LogLevel.Error) console.error(msg);
                },
            })
            .build();

        conn.on('OrdersChanged', () => {
            orderService.getAllOrdersToCashier()
                .then(setServedOrders)
                .catch(() => {});
            refreshTransactions();
        });

        let cancelled = false;
        conn.start().catch(err => { if (!cancelled) console.error('SignalR:', err); });
        return () => { cancelled = true; conn.stop(); };
    }, []);

    const handlePaymentComplete = (orderId: number) => {
        setServedOrders(prev => prev.filter(o => o.id !== orderId));
        setSelectedOrder(null);
        refreshTransactions();
    };

    const todayRevenue = completedRevenue + servedOrders.reduce((s, o) => s + o.totalPrice, 0);
    const totalCount = completedCount + servedOrders.length;
    const avgTicket = totalCount > 0 ? todayRevenue / totalCount : 0;

    return (
        <>
            {/* Dark stats bar */}
            <div className="bg-sidebar px-6 py-4 flex items-center gap-8 shrink-0">
                <div>
                    <p className="text-lg font-serif font-bold text-sidebar-foreground">₺{todayRevenue.toFixed(0)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Bugünkü Ciro</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div>
                    <p className="text-lg font-bold text-sidebar-foreground">{totalCount}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">İşlem</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div>
                    <p className="text-lg font-bold text-sidebar-foreground">₺{avgTicket.toFixed(0)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Ortalama</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div>
                    <p className="text-lg font-bold text-sidebar-foreground">{servedOrders.length}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Bekleyen Masa</p>
                </div>
            </div>

            {/* İçerik */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sol: Ödeme bekleyen masalar */}
                <div className="flex-1 overflow-y-auto p-6">
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

                    {servedOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Açık masa yok.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {servedOrders.map(order => (
                                <div
                                    key={order.id}
                                    className="bg-card border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="font-serif font-bold text-lg text-foreground">
                                            Masa {order.tableName}
                                        </span>
                                        <span className="text-xs text-muted-foreground">— kişilik</span>
                                    </div>

                                    <p className="text-2xl font-serif font-bold text-foreground">
                                        ₺{order.totalPrice.toFixed(0)}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{order.createdByUserName} · {formatElapsed(order.createdAt, now)}</span>
                                        <span>{order.orderItems.length} ürün</span>
                                    </div>

                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="w-full bg-rb-accent-bg hover:opacity-80 text-rb-accent text-sm font-semibold rounded-xl py-2 transition-colors"
                                    >
                                        Ödeme Al
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sağ: Vardiya işlemleri */}
                <div className="w-72 xl:w-80 border-l shrink-0 overflow-y-auto p-6">
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
                                const hasMultipleDetails = txn.details.length > 1;
                                return (
                                    <div key={txn.id} className="py-3.5 first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-muted-foreground bg-muted rounded-md px-2 py-1.5 shrink-0 tabular-nums">
                                                {time}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-foreground truncate">
                                                    {txn.tableName ? `Masa ${txn.tableName}` : 'Masa —'}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {[formatShortName(txn.createdByUserName), `${txn.itemCount} ürün`].filter(Boolean).join(' · ')}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PAYMENT_METHOD_COLORS[txn.method]}`}>
                                                    {PAYMENT_METHOD_LABELS[txn.method]}
                                                </span>
                                                <span className="text-base font-serif font-bold text-foreground">₺{txn.amount.toFixed(0)}</span>
                                            </div>
                                        </div>

                                        {hasMultipleDetails && (
                                            <button
                                                onClick={() => setSelectedTransaction(txn)}
                                                className="mt-1.5 ml-13 text-xs text-rb-accent hover:underline"
                                            >
                                                Detay görmek için tıklayın
                                            </button>
                                        )}
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
        </>
    );
}
