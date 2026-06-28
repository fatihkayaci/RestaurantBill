import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { orderService } from '@/features/orders/api/orderService';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import type { Order } from '@/features/orders/types';
import type { CashTransaction } from '@/features/cashier/types';
import PaymentPanel from './components/PaymentPanel';

const MOCK_PAYMENT_LABELS = ['KART', 'NAKİT', 'QR / TEMASSIZ'] as const;
const MOCK_PAYMENT_COLORS = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
];

export default function CashierDashboardPage() {
    const [servedOrders, setServedOrders] = useState<Order[]>([]);
    const [transactions, setTransactions] = useState<CashTransaction[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [completedRevenue, setCompletedRevenue] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const refreshTransactions = () => {
        cashRegisterService.getTransactions()
            .then(data => {
                const income = data.filter(t => t.type === 1);
                setCompletedCount(income.length);
                setCompletedRevenue(income.reduce((s, t) => s + t.amount, 0));
                setTransactions(income.slice(0, 10));
            })
            .catch(() => {});
    };

    useEffect(() => {
        orderService.getAllOrdersToCashier()
            .then(setServedOrders)
            .catch(() => {});
        refreshTransactions();
    }, []);

    useEffect(() => {
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/cashier-hub`)
            .withAutomaticReconnect()
            .configureLogging({
                log(level: signalR.LogLevel, msg: string) {
                    if (msg.includes('stopped during negotiation')) return;
                    if (level >= signalR.LogLevel.Error) console.error(msg);
                },
            })
            .build();

        conn.on('OrderServed', () => {
            orderService.getAllOrdersToCashier()
                .then(setServedOrders)
                .catch(() => {});
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
            <div className="bg-[#1c1917] dark:bg-[#0f0e0d] px-6 py-4 flex items-center gap-8 shrink-0">
                <div>
                    <p className="text-lg font-serif font-bold text-white">₺{todayRevenue.toFixed(0)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Bugünkü Ciro</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div>
                    <p className="text-lg font-bold text-white">{totalCount}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">İşlem</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div>
                    <p className="text-lg font-bold text-white">₺{avgTicket.toFixed(0)}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Ortalama</p>
                </div>
                <div className="w-px h-8 bg-gray-700" />
                <div>
                    <p className="text-lg font-bold text-amber-400">{servedOrders.length}</p>
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
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded">
                                {servedOrders.length}
                            </span>
                        )}
                    </div>

                    {servedOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Ödeme bekleyen masa yok.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {servedOrders.map(order => (
                                <div
                                    key={order.id}
                                    className="bg-background border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="font-serif font-bold text-lg text-foreground">
                                            Masa {order.tableId}
                                        </span>
                                        <span className="text-xs text-muted-foreground">— kişilik</span>
                                    </div>

                                    <p className="text-2xl font-serif font-bold text-foreground">
                                        ₺{order.totalPrice.toFixed(0)}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>— · 0dk</span>
                                        <span>{order.orderItems.length} ürün</span>
                                    </div>

                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl py-2 transition-colors"
                                    >
                                        Ödeme Al
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sağ: Son işlemler */}
                <div className="w-72 xl:w-80 border-l shrink-0 overflow-y-auto p-6">
                    <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-5">
                        Son İşlemler
                    </h2>

                    {transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
                    ) : (
                        <div className="space-y-4">
                            {transactions.map(txn => {
                                const methodIdx = txn.id % 3;
                                const time = new Date(txn.createdAt)
                                    .toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div key={txn.id} className="flex items-start gap-3">
                                        <span className="text-xs text-muted-foreground w-10 shrink-0 mt-0.5">
                                            {time}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-medium text-foreground truncate">
                                                    Kasa #{txn.cashRegisterId}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${MOCK_PAYMENT_COLORS[methodIdx]}`}>
                                                    {MOCK_PAYMENT_LABELS[methodIdx]}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-xs text-muted-foreground">— · — ürün</span>
                                                <span className="text-sm font-bold text-foreground">₺{txn.amount.toFixed(0)}</span>
                                            </div>
                                        </div>
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
                        className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setSelectedOrder(null)}
                    />
                    <div className="fixed top-0 right-0 bottom-0 z-30 w-full sm:w-105 shadow-2xl animate-in slide-in-from-right duration-300">
                        <PaymentPanel
                            order={selectedOrder}
                            onClose={() => setSelectedOrder(null)}
                            onComplete={handlePaymentComplete}
                        />
                    </div>
                </>
            )}
        </>
    );
}
