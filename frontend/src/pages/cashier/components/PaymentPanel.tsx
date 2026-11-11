import { useState, useEffect } from 'react';
import { X, ChevronDown, CreditCard, QrCode, Minus, Plus, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { paymentService } from '@/features/cashier/api/paymentService';
import { orderService } from '@/features/orders/api/orderService';
import type { Order } from '@/features/orders/types';
import type { Shift, ShiftStartCandidate } from '@/features/cashier/types';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatPrice } from '@/lib/format';

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

    const { shift: cashierActiveShift } = useActiveShift();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('kart');
    const [manualShift, setManualShift] = useState<Shift | null>(null);
    const [cashRegisters, setCashRegisters] = useState<ShiftStartCandidate[]>([]);
    const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>('');
    const [loadingCashRegisters, setLoadingCashRegisters] = useState(cashRegisterMode === 'manual');
    const [ensuringShift, setEnsuringShift] = useState(false);
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
        if (cashRegisterMode !== 'manual') return;
        shiftService.getStartCandidates()
            .then(setCashRegisters)
            .catch(() => {})
            .finally(() => setLoadingCashRegisters(false));
    }, [cashRegisterMode]);

    const activeShift = cashRegisterMode === 'shift' ? cashierActiveShift : manualShift;

    const handleSelectRegister = async (register: ShiftStartCandidate) => {
        setSelectedCashRegisterId(register.cashRegisterId);
        setManualShift(null);
        if (!register.hasOpenShift) {
            toast.warning(`${register.cashRegisterName} kasasında açık vardiya yok, bu ödemeyle birlikte sizin adınıza açılacak.`);
        }
        setEnsuringShift(true);
        try {
            const shift = await shiftService.ensureOpen(register.cashRegisterId);
            setManualShift(shift);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bu kasada vardiya açılamadı.'));
        } finally {
            setEnsuringShift(false);
        }
    };

    const cashRegisterId = activeShift?.cashRegisterId;
    const canComplete = !submitting && !ensuringShift && !!cashRegisterId;

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
            const paidMessage = discountValue > 0 ? `Ödeme tamamlandı! (₺${formatPrice(netAmount)})` : 'Ödeme tamamlandı!';
            if (fullyPaid) {
                toast.success(paidMessage);
                onComplete(displayOrder.id);
            } else {
                toast.success('Kısmi ödeme alındı, kalan tutar için masa açık kalıyor.');
                const refreshed = await orderService.getOrderByTableId(displayOrder.tableId);
                if (refreshed) setDisplayOrder(refreshed);
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ödeme tamamlanamadı.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 sm:px-8 pt-5 sm:pt-6 pb-4 shrink-0 border-b border-border">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">
                            {displayOrder.tableName} — Hesap
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {displayOrder.createdByUserName || '—'} · {formatElapsed(displayOrder.createdAt)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        className="w-11 h-11 shrink-0 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
                {/* Sol: Ürünler */}
                <div className="md:flex-1 md:overflow-y-auto px-4 sm:px-8 py-5">
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
                                        <p className="text-xs text-muted-foreground">₺{formatPrice(item.unitPrice)} / adet</p>
                                        {item.note && <p className="text-xs text-rb-amber mt-0.5">Not: {item.note}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div
                                        className={`flex items-center gap-2 rounded-lg border-[1.5px] px-1 py-1 transition-colors ${selectedQty > 0 ? 'border-rb-accent' : 'border-border'}`}
                                    >
                                        <button
                                            onClick={() => adjustSelection(item.id, item.quantity, -1)}
                                            disabled={selectedQty === 0}
                                            aria-label={`${item.productName}: bu ödemedeki adedi azalt`}
                                            className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <input
                                            type="number"
                                            value={selectedQty}
                                            min={0}
                                            max={item.quantity}
                                            onChange={(e) => setSelectionValue(item.id, item.quantity, e.target.valueAsNumber)}
                                            aria-label={`${item.productName}: bu ödemede ödenecek adet`}
                                            className={`w-9 text-center text-sm font-semibold tabular-nums bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedQty > 0 ? 'text-rb-accent' : 'text-muted-foreground'}`}
                                        />
                                        <button
                                            onClick={() => adjustSelection(item.id, item.quantity, 1)}
                                            disabled={selectedQty >= item.quantity}
                                            aria-label={`${item.productName}: bu ödemedeki adedi artır`}
                                            className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <span className="text-sm font-semibold text-foreground tabular-nums w-14 text-right">
                                        ₺{formatPrice(item.unitPrice * item.quantity)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Sağ: Toplam + Ödeme */}
                <div className="md:w-90 shrink-0 border-t md:border-t-0 md:border-l border-border md:overflow-y-auto flex flex-col">
                    <div className="px-6 py-6 text-center border-b border-border">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tahsil edilecek</p>
                        <p className="mt-1 text-4xl font-serif font-bold tabular-nums text-foreground">
                            ₺{formatPrice(netAmount)}
                        </p>
                        {(hasSelection || discountValue > 0) && (
                            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                Sipariş toplamı ₺{formatPrice(displayOrder.totalPrice)}
                            </p>
                        )}
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
                                                        <span className="tabular-nums">₺{formatAmount(matrah)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>KDV Tutarı</span>
                                                        <span className="tabular-nums">₺{formatAmount(kdvTutari)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-medium text-foreground pt-0.5">
                                                        <span>Ara Toplam</span>
                                                        <span className="tabular-nums">₺{formatAmount(group.total)}</span>
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
                                <span className="text-sm font-semibold text-rb-accent tabular-nums">₺{formatPrice(selectedTotal)}</span>
                            </div>
                        )}
                        {discountValue > 0 && (
                            <div className="mt-3 rounded-lg bg-rb-red-bg border border-rb-red px-3 py-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-rb-red">İndirim</span>
                                <span className="text-sm font-semibold text-rb-red tabular-nums">-₺{formatPrice(discountValue)}</span>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground">İndirim</p>
                                <div className="flex rounded-lg border border-border p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => onDiscountTypeChange('percent')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                            discountType === 'percent' ? 'bg-rb-accent text-rb-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        %
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDiscountTypeChange('amount')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                            discountType === 'amount' ? 'bg-rb-accent text-rb-accent-foreground' : 'text-muted-foreground hover:text-foreground'
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
                                    placeholder="Not (isteğe bağlı)"
                                    className="mt-2 w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rb-accent"
                                />
                            )}
                        </div>

                        {cashRegisterMode === 'shift' ? (
                            activeShift ? (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Kasa</span>
                                    <span className="text-sm font-medium text-foreground">{activeShift.cashRegisterName}</span>
                                </div>
                            ) : (
                                <p className="text-sm text-destructive">Açık bir vardiyanız yok, ödeme alınamaz.</p>
                            )
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
                                            const isSelected = selectedCashRegisterId === register.cashRegisterId;
                                            return (
                                                <button
                                                    key={register.cashRegisterId}
                                                    onClick={() => handleSelectRegister(register)}
                                                    disabled={ensuringShift}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isSelected ? 'border-rb-accent bg-rb-accent-bg ring-1 ring-rb-accent' : 'border-border bg-card hover:bg-muted/50'}`}
                                                >
                                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-rb-accent text-rb-accent-foreground' : 'bg-muted'}`}>
                                                        <Landmark className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-rb-accent' : ''}`}>{register.cashRegisterName}</p>
                                                        <p className={`text-xs ${!register.hasOpenShift && !(isSelected && ensuringShift) ? 'text-rb-amber font-medium' : 'text-muted-foreground'}`}>
                                                            {isSelected && ensuringShift
                                                                ? 'Vardiya açılıyor...'
                                                                : register.hasOpenShift
                                                                    ? `${register.openShiftOwnerName || 'Açık'} vardiyası · ${formatAmount(register.expectedOpeningBalance ?? 0)} ₺`
                                                                    : 'Vardiya yok, sizin adınıza açılacak'}
                                                        </p>
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
                                    className={`flex-1 flex h-14 items-center justify-center gap-2 rounded-xl border-[1.5px] text-base font-semibold transition-colors ${
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
                            className={`w-full h-14 rounded-xl text-base font-semibold transition-colors ${
                                canComplete
                                    ? 'bg-rb-green text-rb-green-foreground hover:opacity-90 cursor-pointer'
                                    : 'bg-rb-neutral-bg text-muted-foreground cursor-not-allowed'
                            }`}
                        >
                            {submitting
                                ? 'İşleniyor...'
                                : hasSelection
                                    ? `Seçilenleri Öde (₺${formatPrice(netAmount)})`
                                    : `Tümünü Öde (₺${formatPrice(netAmount)})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
