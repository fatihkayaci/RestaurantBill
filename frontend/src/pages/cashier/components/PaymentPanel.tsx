import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronLeft, ChevronRight, CreditCard, QrCode, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import { orderService } from '@/features/orders/api/orderService';
import type { Order } from '@/features/orders/types';
import type { CashRegister } from '@/features/cashier/types';

type PaymentMethod = 'kart' | 'nakit' | 'qr';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode; selectedClass: string }[] = [
    { key: 'kart', label: 'Kart', icon: <CreditCard className="w-4 h-4" />, selectedClass: 'border-rb-accent text-rb-accent bg-rb-accent-bg' },
    { key: 'nakit', label: 'Nakit', icon: <span className="text-sm font-bold leading-none">₺</span>, selectedClass: 'border-rb-green text-rb-green bg-rb-green-bg' },
    { key: 'qr', label: 'QR', icon: <QrCode className="w-4 h-4" />, selectedClass: 'border-rb-amber text-rb-amber bg-rb-amber-bg' },
];

interface Props {
    order: Order;
    onClose: () => void;
    onComplete: (orderId: number) => void;
}

function formatElapsed(createdAt: string): string {
    const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}sa ${minutes}dk` : `${minutes}dk`;
}

export default function PaymentPanel({ order, onClose, onComplete }: Props) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('kart');
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
    const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const registerScrollRef = useRef<HTMLDivElement>(null);

    const taxGroups = Object.values(
        order.orderItems.reduce((acc, item) => {
            const key = item.taxRate;
            if (!acc[key]) acc[key] = { rate: key, total: 0, categories: new Set<string>() };
            acc[key].total += item.unitPrice * item.quantity;
            if (item.categoryName) acc[key].categories.add(item.categoryName);
            return acc;
        }, {} as Record<number, { rate: number; total: number; categories: Set<string> }>)
    ).sort((a, b) => a.rate - b.rate);

    useEffect(() => {
        cashRegisterService.getCashRegisters()
            .then(data => {
                const open = data.filter(r => r.status === 1);
                setCashRegisters(open);
                setSelectedRegisterId(open[0]?.id ?? null);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const el = registerScrollRef.current;
        if (!el) return;
        const checkOverflow = () => {
            setCanScrollLeft(el.scrollLeft > 0);
            setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
        };
        checkOverflow();
        const observer = new ResizeObserver(checkOverflow);
        observer.observe(el);
        el.addEventListener('scroll', checkOverflow);
        return () => {
            observer.disconnect();
            el.removeEventListener('scroll', checkOverflow);
        };
    }, [cashRegisters]);

    const canComplete = !submitting && !!selectedRegisterId;

    const handleComplete = async () => {
        const register = cashRegisters.find(r => r.id === selectedRegisterId);
        if (!register) {
            toast.error('Ödeme almak için bir kasa seçin.');
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-8 pt-6 pb-4 shrink-0 border-b border-border">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">
                            Masa {order.tableName} — Hesap
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {order.createdByUserName || '—'} · {formatElapsed(order.createdAt)}
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

            <div className="flex-1 flex overflow-hidden">
                {/* Sol: Ürünler */}
                <div className="flex-1 overflow-y-auto px-8 py-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                        Sipariş Kalemleri
                    </p>
                    {order.orderItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-4 py-3.5 border-b border-dashed border-border">
                            <div className="flex items-start gap-3">
                                <span className="text-sm text-muted-foreground mt-0.5 w-7 shrink-0">×{item.quantity}</span>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{item.productName}</p>
                                    <p className="text-xs text-muted-foreground">₺{item.unitPrice} / adet</p>
                                </div>
                            </div>
                            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                                ₺{(item.unitPrice * item.quantity).toFixed(0)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Sağ: Toplam + Ödeme */}
                <div className="w-90 shrink-0 border-l border-border overflow-y-auto flex flex-col">
                    <div className="px-6 py-6 text-center border-b border-border">
                        <p className="text-4xl font-serif font-bold text-foreground">
                            ₺{order.totalPrice.toFixed(0)}
                        </p>
                        {taxGroups.length > 1 ? (
                            <div className="mt-2">
                                <button
                                    onClick={() => setShowTaxBreakdown(v => !v)}
                                    className="mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    KDV Dahil — Detay
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTaxBreakdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showTaxBreakdown && (
                                    <div className="mt-3 rounded-lg border border-border divide-y divide-border text-left overflow-hidden">
                                        {taxGroups.map(group => {
                                            const matrah = group.total / (1 + group.rate / 100);
                                            const kdvTutari = group.total - matrah;
                                            return (
                                                <div key={group.rate} className="px-3 py-2.5 space-y-1">
                                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                        {Array.from(group.categories).join(', ') || 'Diğer'} · %{group.rate}
                                                    </p>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>Matrah</span>
                                                        <span className="tabular-nums">₺{matrah.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>KDV Tutarı</span>
                                                        <span className="tabular-nums">₺{kdvTutari.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-medium text-foreground pt-0.5">
                                                        <span>Ara Toplam</span>
                                                        <span className="tabular-nums">₺{group.total.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground text-center">KDV Dahil</p>
                        )}
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        {cashRegisters.length === 0 ? (
                            <p className="text-sm text-destructive">Açık kasa bulunamadı.</p>
                        ) : cashRegisters.length > 1 ? (
                            <div className="relative">
                                <p className="text-xs text-muted-foreground mb-1.5">Kasa</p>
                                <div
                                    ref={registerScrollRef}
                                    className="flex gap-2 overflow-x-auto scroll-smooth"
                                    style={{ scrollbarWidth: 'none' }}
                                >
                                    {cashRegisters.map(register => {
                                        const isSelected = register.id === selectedRegisterId;
                                        return (
                                            <button
                                                key={register.id}
                                                onClick={() => setSelectedRegisterId(register.id)}
                                                className={`flex flex-col items-center gap-1 w-17 shrink-0 py-2 rounded-lg border-[1.5px] transition-colors ${
                                                    isSelected ? 'border-rb-accent bg-rb-accent-bg' : 'border-border hover:border-muted-foreground'
                                                }`}
                                            >
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-rb-accent text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    <Landmark className="h-4 w-4" />
                                                </div>
                                                <span className={`text-[11px] font-medium truncate max-w-full px-1 ${isSelected ? 'text-rb-accent' : 'text-muted-foreground'}`}>
                                                    {register.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {canScrollLeft && (
                                    <button
                                        onClick={() => registerScrollRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
                                        className="absolute left-0 top-1/2 translate-y-1.5 w-6 h-6 rounded-full bg-background border border-border shadow flex items-center justify-center text-muted-foreground hover:text-foreground"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {canScrollRight && (
                                    <button
                                        onClick={() => registerScrollRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
                                        className="absolute right-0 top-1/2 translate-y-1.5 w-6 h-6 rounded-full bg-background border border-border shadow flex items-center justify-center text-muted-foreground hover:text-foreground"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ) : null}

                        <div className="flex gap-2">
                            {PAYMENT_METHODS.map(({ key, label, icon, selectedClass }) => (
                                <button
                                    key={key}
                                    onClick={() => setPaymentMethod(key)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-[1.5px] text-sm font-medium transition-colors ${
                                        paymentMethod === key ? selectedClass : 'border-border text-muted-foreground hover:border-muted-foreground'
                                    }`}
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleComplete}
                            disabled={!canComplete}
                            className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-colors ${
                                canComplete
                                    ? 'bg-rb-green text-white hover:opacity-90 cursor-pointer'
                                    : 'bg-black/12 text-muted-foreground cursor-not-allowed'
                            }`}
                        >
                            {submitting ? 'İşleniyor...' : 'Ödemeyi Tamamla ✓'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
