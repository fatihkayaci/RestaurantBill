import { X } from 'lucide-react';
import type { PaymentMethod, ShiftTransaction } from '@/features/cashier/types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { 1: 'KART', 2: 'NAKİT', 3: 'QR' };
const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
    1: 'bg-rb-accent-bg text-rb-accent',
    2: 'bg-rb-green-bg text-rb-green',
    3: 'bg-rb-amber-bg text-rb-amber',
};

interface Props {
    transaction: ShiftTransaction;
    onClose: () => void;
}

function formatShortName(fullName: string): string {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export default function TransactionDetailPanel({ transaction, onClose }: Props) {
    return (
        <div className="flex flex-col h-full">
            <div className="px-8 pt-6 pb-4 shrink-0 border-b border-border">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">
                            {transaction.tableName ? `Masa ${transaction.tableName}` : 'Masa —'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {[formatShortName(transaction.createdByUserName), `${transaction.itemCount} ürün`].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    KDV Kırılımı
                </p>
                <div className="flex items-center justify-between text-sm mb-6 pb-4 border-b border-dashed border-border">
                    <span className="font-medium text-foreground">Toplam KDV</span>
                    <span className="font-medium text-foreground tabular-nums">₺{transaction.taxAmount.toFixed(2)}</span>
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Ödeme Detayı
                </p>
                <div className="space-y-3">
                    {transaction.details.map((d, i) => {
                        const time = new Date(d.createdAt)
                            .toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div
                                key={i}
                                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                            >
                                <span className="text-xs font-medium text-muted-foreground bg-muted rounded-md px-2 py-1.5 shrink-0 tabular-nums">
                                    {time}
                                </span>
                                <span className="flex-1 text-sm text-muted-foreground">
                                    {d.itemCount} ürün
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${PAYMENT_METHOD_COLORS[d.method]}`}>
                                    {PAYMENT_METHOD_LABELS[d.method]}
                                </span>
                                <span className="text-sm font-serif font-bold text-foreground tabular-nums w-16 text-right">
                                    ₺{d.amount.toFixed(0)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="px-8 py-5 border-t border-dashed border-border shrink-0">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Toplam</span>
                    <span className="font-serif text-2xl font-bold text-foreground tabular-nums">
                        ₺{transaction.amount.toFixed(0)}
                    </span>
                </div>
            </div>
        </div>
    );
}
