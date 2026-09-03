import { useState, useEffect } from 'react';
import { X, ChevronDown, CreditCard, QrCode, Minus, Plus, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { paymentService } from '@/features/cashier/api/paymentService';
import { cashRegisterService } from '@/features/cashier/api/cashRegisterService';
import { orderService } from '@/features/orders/api/orderService';
import type { Order } from '@/features/orders/types';
import type { CurrentShift, CashRegister } from '@/features/cashier/types';

type PaymentMethod = 'kart' | 'nakit' | 'qr';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode; selectedClass: string }[] = [
    { key: 'kart', label: 'Kart', icon: <CreditCard className="w-4 h-4" />, selectedClass: 'border-rb-accent text-rb-accent bg-rb-accent-bg' },
    { key: 'nakit', label: 'Nakit', icon: <span className="text-sm font-bold leading-none">₺</span>, selectedClass: 'border-rb-green text-rb-green bg-rb-green-bg' },
    { key: 'qr', label: 'QR', icon: <QrCode className="w-4 h-4" />, selectedClass: 'border-rb-amber text-rb-amber bg-rb-amber-bg' },
];

const PAYMENT_METHOD_VALUES: Record<PaymentMethod, number> = { kart: 1, nakit: 2, qr: 3 };

interface Props {
    order: Order;
    onClose: () => void;
    onComplete: (orderId: number) => void;
    cashRegisterMode?: 'shift' | 'manual';
}

function formatElapsed(createdAt: string): string {
    const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}sa ${minutes}dk` : `${minutes}dk`;
}

export default function PaymentPanel({ order, onClose, onComplete, cashRegisterMode = 'shift' }: Props) {
    const [displayOrder, setDisplayOrder] = useState<Order>(order);
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [discountValueInput, setDiscountValueInput] = useState('');
    const [discountNote, setDiscountNote] = useState('');

    const resetDiscount = () => {
        setDiscountType('percent');
        setDiscountValueInput('');
        setDiscountNote('');
    };

    // Keep the displayed order in sync when the parent passes a freshly-updated order object.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayOrder(order);
        resetDiscount();
    }, [order]);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('kart');
    const [activeShift, setActiveShift] = useState<CurrentShift | null>(null);
    const [loadingShift, setLoadingShift] = useState(cashRegisterMode === 'shift');
    const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
    const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>('');
    const [loadingCashRegisters, setLoadingCashRegisters] = useState(cashRegisterMode === 'manual');
    const [submitting, setSubmitting] = useState(false);
    const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
    const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});

    const onDiscountTypeChange = (type: 'percent' | 'amount') => {
        setDiscountType(type);
        setDiscountValueInput('');
    };

    const selectedTotal = displayOrder.orderItems.reduce(
        (sum, item) => sum + (selectedQuantities[item.id] ?? 0) * item.unitPrice,
        0
    );
    const hasSelection = selectedTotal > 0;

    const chargeBase = hasSelection ? selectedTotal : displayOrder.totalPrice;
    const discountValue = Math.min(
        discountType === 'percent'
            ? chargeBase * (parseFloat(discountValueInput) || 0) / 100
            : parseFloat(discountValueInput) || 0,
        chargeBase
    );
    const netAmount = Math.max(chargeBase - discountValue, 0);

    const adjustSelection = (itemId: number, maxQuantity: number, delta: number) => {
        setSelectedQuantities(prev => {
            const next = Math.min(Math.max((prev[itemId] ?? 0) + delta, 0), maxQuantity);
            return { ...prev, [itemId]: next };
        });
    };

    const setSelectionValue = (itemId: number, maxQuantity: number, value: number) => {
        const next = Math.min(Math.max(Number.isFinite(value) ? Math.trunc(value) : 0, 0), maxQuantity);
        setSelectedQuantities(prev => ({ ...prev, [itemId]: next }));
    };

    const taxGroups = Object.values(
        displayOrder.orderItems.reduce((acc, item) => {
            const key = item.taxRate;
            if (!acc[key]) acc[key] = { rate: key, total: 0, categories: new Set<string>() };
            acc[key].total += item.unitPrice * item.quantity;
            if (item.categoryName) acc[key].categories.add(item.categoryName);
            return acc;
        }, {} as Record<number, { rate: number; total: number; categories: Set<string> }>)
    ).sort((a, b) => a.rate - b.rate);

    useEffect(() => {
        if (cashRegisterMode === 'shift') {
            shiftService.getMyCurrent()
                .then(setActiveShift)
                .catch(() => {})
                .finally(() => setLoadingShift(false));
        } else {
            cashRegisterService.getCashRegisters()
                .then(registers => setCashRegisters(registers.filter(r => r.status === 1)))
                .catch(() => {})
                .finally(() => setLoadingCashRegisters(false));
        }
    }, [cashRegisterMode]);

    const cashRegisterId = cashRegisterMode === 'shift' ? activeShift?.cashRegisterId : selectedCashRegisterId;
    const canComplete = !submitting && !!cashRegisterId;

    const handleComplete = async () => {
        if (!cashRegisterId) {
            toast.error(cashRegisterMode === 'shift' ? 'Ödeme almak için açık bir vardiyanız olmalı.' : 'Ödeme almak için bir kasa seçmelisiniz.');
            return;
        }
        const itemsToPay = hasSelection
            ? displayOrder.orderItems
                .filter(item => (selectedQuantities[item.id] ?? 0) > 0)
                .map(item => ({ orderItemId: item.id, quantity: selectedQuantities[item.id] }))
            : displayOrder.orderItems.map(item => ({ orderItemId: item.id, quantity: item.quantity }));

        const discount = discountValueInput
            ? {
                percent: discountType === 'percent' ? parseFloat(discountValueInput) : undefined,
                amount: discountType === 'amount' ? parseFloat(discountValueInput) : undefined,
                note: discountNote || undefined,
            }
            : undefined;

        try {
            setSubmitting(true);
            const fullyPaid: boolean = await paymentService.createPayment(displayOrder.id, cashRegisterId, PAYMENT_METHOD_VALUES[paymentMethod], itemsToPay, discount);
            setSelectedQuantities({});
            resetDiscount();
            const paidMessage = discountValue > 0 ? `Ödeme tamamlandı! (₺${netAmount.toFixed(0)})` : 'Ödeme tamamlandı!';
            if (fullyPaid) {
                toast.success(paidMessage);
                onComplete(displayOrder.id);
            } else {
                toast.success('Kısmi ödeme alındı, kalan tutar için masa açık kalıyor.');
                const refreshed = await orderService.getOrderByTableId(displayOrder.tableId);
                if (refreshed) setDisplayOrder(refreshed);
            }
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
                            Masa {displayOrder.tableName} — Hesap
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {displayOrder.createdByUserName || '—'} · {formatElapsed(displayOrder.createdAt)}
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
                    {displayOrder.orderItems.map((item, i) => {
                        const selectedQty = selectedQuantities[item.id] ?? 0;
                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between gap-4 py-3.5 border-b border-dashed border-border"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-sm text-muted-foreground mt-0.5 w-7 shrink-0">×{item.quantity}</span>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">₺{item.unitPrice} / adet</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div
                                        className={`flex items-center gap-2 rounded-lg border-[1.5px] px-1 py-1 transition-colors ${selectedQty > 0 ? 'border-rb-accent' : 'border-border'}`}
                                    >
                                        <button
                                            onClick={() => adjustSelection(item.id, item.quantity, -1)}
                                            disabled={selectedQty === 0}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <input
                                            type="number"
                                            value={selectedQty}
                                            min={0}
                                            max={item.quantity}
                                            onChange={(e) => setSelectionValue(item.id, item.quantity, e.target.valueAsNumber)}
                                            className={`w-9 text-center text-sm font-semibold tabular-nums bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedQty > 0 ? 'text-rb-accent' : 'text-muted-foreground'}`}
                                        />
                                        <button
                                            onClick={() => adjustSelection(item.id, item.quantity, 1)}
                                            disabled={selectedQty >= item.quantity}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <span className="text-sm font-semibold text-foreground tabular-nums w-14 text-right">
                                        ₺{(item.unitPrice * item.quantity).toFixed(0)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Sağ: Toplam + Ödeme */}
                <div className="w-90 shrink-0 border-l border-border overflow-y-auto flex flex-col">
                    <div className="px-6 py-6 text-center border-b border-border">
                        <p className="text-4xl font-serif font-bold text-foreground">
                            ₺{displayOrder.totalPrice.toFixed(0)}
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
                                                        {Array.from(group.categories).join(', ') || 'Diğer'} · KDV %{group.rate}
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
                        {hasSelection && (
                            <div className="mt-3 rounded-lg bg-rb-accent-bg border border-rb-accent px-3 py-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-rb-accent">Seçili Tutar</span>
                                <span className="text-sm font-semibold text-rb-accent tabular-nums">₺{selectedTotal.toFixed(0)}</span>
                            </div>
                        )}
                        {discountValue > 0 && (
                            <div className="mt-3 rounded-lg bg-rb-red-bg border border-rb-red px-3 py-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-rb-red">İskonto</span>
                                <span className="text-sm font-semibold text-rb-red tabular-nums">-₺{discountValue.toFixed(0)}</span>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground">İskonto</p>
                                <div className="flex rounded-lg border border-border p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => onDiscountTypeChange('percent')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                            discountType === 'percent' ? 'bg-rb-accent text-white' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        %
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDiscountTypeChange('amount')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                            discountType === 'amount' ? 'bg-rb-accent text-white' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        ₺
                                    </button>
                                </div>
                            </div>
                            <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={discountType === 'percent' ? 100 : undefined}
                                value={discountValueInput}
                                onChange={e => setDiscountValueInput(e.target.value)}
                                placeholder={discountType === 'percent' ? 'Yüzde girin (%)' : 'Tutar girin (₺)'}
                                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rb-accent"
                            />
                            {discountValue > 0 && (
                                <input
                                    type="text"
                                    value={discountNote}
                                    onChange={e => setDiscountNote(e.target.value)}
                                    placeholder="Not (opsiyonel)"
                                    className="mt-2 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rb-accent"
                                />
                            )}
                        </div>

                        {cashRegisterMode === 'shift' ? (
                            !loadingShift && !activeShift ? (
                                <p className="text-sm text-destructive">Açık bir vardiyanız yok, ödeme alınamaz.</p>
                            ) : activeShift ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Kasa</span>
                                    <span className="text-sm font-medium text-foreground">{activeShift.cashRegisterName}</span>
                                </div>
                            ) : null
                        ) : (
                            <div>
                                <p className="text-xs text-muted-foreground mb-2">Kasa Seç</p>
                                {loadingCashRegisters ? (
                                    <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                                ) : cashRegisters.length === 0 ? (
                                    <p className="text-sm text-destructive">Açık kasa bulunamadı.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {cashRegisters.map(register => {
                                            const isSelected = selectedCashRegisterId === String(register.id);
                                            return (
                                                <button
                                                    key={register.id}
                                                    onClick={() => setSelectedCashRegisterId(String(register.id))}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSelected ? 'border-rb-accent bg-rb-accent-bg ring-1 ring-rb-accent' : 'border-border bg-card hover:bg-muted/50'}`}
                                                >
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-rb-accent text-white' : 'bg-muted'}`}>
                                                        <Landmark className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-rb-accent' : ''}`}>{register.name}</p>
                                                        <p className="text-xs text-muted-foreground">{register.balance.toFixed(2)} ₺</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

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
                            {submitting
                                ? 'İşleniyor...'
                                : hasSelection
                                    ? `Seçilenleri Öde (₺${netAmount.toFixed(0)}) ✓`
                                    : `Tümünü Öde (₺${netAmount.toFixed(0)}) ✓`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
