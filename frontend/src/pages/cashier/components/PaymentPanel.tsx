import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import { orderService } from '@/features/orders/api/orderService';
import type { Order } from '@/features/orders/types';
import type { CashRegister } from '@/features/cashier/types';

type PaymentMethod = 'kart' | 'nakit' | 'qr';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
    { key: 'kart', label: 'Kart' },
    { key: 'nakit', label: 'Nakit' },
    { key: 'qr', label: 'QR / Temassız' },
];

interface Props {
    order: Order;
    onClose: () => void;
    onComplete: (orderId: number) => void;
}

export default function PaymentPanel({ order, onClose, onComplete }: Props) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('kart');
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        cashRegisterService.getCashRegisters()
            .then(data => setCashRegisters(data.filter(r => r.status === 1)))
            .catch(() => {});
    }, []);

    const handleComplete = async () => {
        const register = cashRegisters[0];
        if (!register) {
            toast.error('Açık kasa bulunamadı.');
            return;
        }
        try {
            setSubmitting(true);
            await cashRegisterService.addTransaction(register.id, 1, order.totalPrice);
            await orderService.closeOrder(order.id);
            toast.success('Ödeme tamamlandı!');
            onComplete(order.id);
        } catch (err: any) {
            toast.error(err.response?.data?.error ?? err.response?.data?.message ?? 'Ödeme tamamlanamadı.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-foreground">
                            Masa {order.tableName} — Hesap
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">— · 0dk</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Sipariş kalemleri */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
                {order.orderItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3.5 border-b last:border-0">
                        <div className="flex items-start gap-3">
                            <span className="text-sm text-muted-foreground mt-0.5 w-6 shrink-0">×{item.quantity}</span>
                            <div>
                                <p className="text-sm font-medium text-foreground">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">₺{item.unitPrice} / adet</p>
                            </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                            ₺{(item.unitPrice * item.quantity).toFixed(0)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Alt: Toplam + Ödeme yöntemi + Buton */}
            <div className="shrink-0 px-6 py-5 border-t">
                <div className="flex items-baseline justify-between mb-0.5">
                    <span className="font-bold text-foreground">Toplam</span>
                    <span className="text-2xl font-serif font-bold text-foreground">
                        ₺{order.totalPrice.toFixed(0)}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">KDV Dahil</p>

                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                    Ödeme Yöntemi
                </p>
                <div className="grid grid-cols-3 gap-2 mb-5">
                    {PAYMENT_METHODS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setPaymentMethod(key)}
                            className={`py-2 px-2 border-2 rounded-lg text-sm font-medium transition-colors ${
                                paymentMethod === key
                                    ? 'border-rb-accent text-rb-accent bg-rb-accent-bg'
                                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleComplete}
                    disabled={submitting}
                    className="w-full bg-rb-green hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 text-sm transition-colors"
                >
                    {submitting ? 'İşleniyor...' : 'Ödemeyi Tamamla ✓'}
                </button>
            </div>
        </div>
    );
}
