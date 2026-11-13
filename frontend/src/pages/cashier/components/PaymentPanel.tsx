import { useState, useEffect } from 'react';
import { X, ChevronDown, CreditCard, QrCode, Minus, Plus, Landmark, Banknote, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { paymentSettingsService, type BranchPaymentSettings } from '@/features/branches/api/paymentSettingsService';
import { getSession } from '@/lib/auth';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { paymentService } from '@/features/cashier/api/paymentService';
import { orderService } from '@/features/orders/api/orderService';
import type { Order } from '@/features/orders/types';
import type { Shift, ShiftStartCandidate } from '@/features/cashier/types';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatPrice, formatElapsed } from '@/lib/format';

type PaymentMethod = 'kart' | 'nakit' | 'qr' | 'iban';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode; selectedClass: string }[] = [
    { key: 'kart', label: 'Kart', icon: <CreditCard className="w-4 h-4" />, selectedClass: 'border-rb-accent text-rb-accent bg-rb-accent-bg' },
    { key: 'nakit', label: 'Nakit', icon: <span className="text-sm font-bold leading-none">₺</span>, selectedClass: 'border-rb-green text-rb-green bg-rb-green-bg' },
    { key: 'qr', label: 'QR', icon: <QrCode className="w-4 h-4" />, selectedClass: 'border-rb-amber text-rb-amber bg-rb-amber-bg' },
    { key: 'iban', label: 'IBAN', icon: <Banknote className="w-4 h-4" />, selectedClass: 'border-rb-purple text-rb-purple bg-rb-purple-bg' },
];

const PAYMENT_METHOD_VALUES: Record<PaymentMethod, number> = { kart: 1, nakit: 2, qr: 3, iban: 4 };

/** Tamamı: kalan hesap · Ürün seç: seçilen kalemler · Tutar gir: ürün seçmeden belirli bir tutar (ürünler masada kalır). */
type Split = 'full' | 'items' | 'amount';
const SPLITS: [Split, string][] = [['full', 'Tamamı'], ['items', 'Ürün seç'], ['amount', 'Tutar gir']];
const AMOUNT_CHIPS: [string, number][] = [['½', 2], ['⅓', 3], ['¼', 4], ['Kalan', 1]];
const round2 = (value: number) => Math.round(value * 100) / 100;

interface Props {
    order: Order;
    onClose: () => void;
    onComplete: (orderId: number) => void;
    cashRegisterMode?: 'shift' | 'manual';
    /** Kısmi ödeme sonrası (masa açık kalır) üst ekrandaki listeyi tazelemek için. */
    onPartialPayment?: () => void;
}

export default function PaymentPanel({ order, onClose, onComplete, cashRegisterMode = 'shift', onPartialPayment }: Props) {
    const [displayOrder, setDisplayOrder] = useState<Order>(order);
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [discountValueInput, setDiscountValueInput] = useState('');
    const [discountNote, setDiscountNote] = useState('');
    const [split, setSplit] = useState<Split>('full');
    const [amountInput, setAmountInput] = useState('');

    const resetDiscount = () => {
        setDiscountType('percent');
        setDiscountValueInput('');
        setDiscountNote('');
    };

    const resetSplit = () => {
        setSplit('full');
        setAmountInput('');
    };

    // Keep the displayed order in sync when the parent passes a freshly-updated order object.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayOrder(order);
        resetDiscount();
        resetSplit();
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
    // Şubenin IBAN'ı: yoksa IBAN seçeneği kapalıdır.
    const [ibanSettings, setIbanSettings] = useState<BranchPaymentSettings | null>(null);
    const hasIban = !!ibanSettings?.iban;

    useEffect(() => {
        paymentSettingsService.get().then(setIbanSettings).catch(() => setIbanSettings(null));
    }, []);

    const onDiscountTypeChange = (type: 'percent' | 'amount') => {
        setDiscountType(type);
        setDiscountValueInput('');
    };

    const selectedTotal = displayOrder.orderItems.reduce(
        (sum, item) => sum + (selectedQuantities[item.id] ?? 0) * item.unitPrice,
        0
    );
    const hasSelection = split === 'items' && selectedTotal > 0;
    // Tutar girerek alınmış ödemeler düşülünce kalan; o durumda ürün seçerek ödeme alınmaz.
    const paidOnAccount = displayOrder.paidAmount ?? 0;
    const due = displayOrder.remainingAmount ?? displayOrder.totalPrice;
    const itemsLocked = paidOnAccount > 0;
    const amountValue = round2(parseFloat(amountInput.replace(',', '.')) || 0);
    const amountTooHigh = split === 'amount' && amountValue > due;

    const chargeBase = split === 'items' ? selectedTotal : split === 'amount' ? Math.min(amountValue, due) : due;
    // İndirim yalnızca ürünlerle kapanan ödemede; tutar girilen ödeme olduğu gibi tahsil edilir.
    const discountAllowed = split !== 'amount';
    const discountValue = discountAllowed ? Math.min(
        discountType === 'percent'
            ? chargeBase * (parseFloat(discountValueInput) || 0) / 100
            : parseFloat(discountValueInput) || 0,
        chargeBase
    ) : 0;
    const netAmount = Math.max(chargeBase - discountValue, 0);

    const chooseSplit = (next: Split) => {
        setSplit(next);
        if (next !== 'items') setSelectedQuantities({});
        if (next !== 'amount') setAmountInput('');
    };

    const adjustSelection = (itemId: number, maxQuantity: number, delta: number) => {
        setSplit('items');
        setAmountInput('');
        setSelectedQuantities(prev => {
            const next = Math.min(Math.max((prev[itemId] ?? 0) + delta, 0), maxQuantity);
            return { ...prev, [itemId]: next };
        });
    };

    const setSelectionValue = (itemId: number, maxQuantity: number, value: number) => {
        setSplit('items');
        setAmountInput('');
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
    const splitReady = split === 'items' ? hasSelection : split === 'amount' ? amountValue > 0 && !amountTooHigh : true;
    const canComplete = !submitting && !ensuringShift && !!cashRegisterId && splitReady && (paymentMethod !== 'iban' || hasIban);

    const handleComplete = async () => {
        if (!cashRegisterId) {
            toast.error(cashRegisterMode === 'shift' ? 'Ödeme almak için açık bir vardiyanız olmalı.' : 'Ödeme almak için bir kasa seçmelisiniz.');
            return;
        }
        const itemsToPay = split === 'amount'
            ? []
            : hasSelection
                ? displayOrder.orderItems
                    .filter(item => (selectedQuantities[item.id] ?? 0) > 0)
                    .map(item => ({ orderItemId: item.id, quantity: selectedQuantities[item.id] }))
                : displayOrder.orderItems.map(item => ({ orderItemId: item.id, quantity: item.quantity }));

        const discount = discountAllowed && discountValueInput
            ? {
                percent: discountType === 'percent' ? parseFloat(discountValueInput) : undefined,
                amount: discountType === 'amount' ? parseFloat(discountValueInput) : undefined,
                note: discountNote || undefined,
            }
            : undefined;

        try {
            setSubmitting(true);
            const fullyPaid: boolean = await paymentService.createPayment(displayOrder.id, cashRegisterId, PAYMENT_METHOD_VALUES[paymentMethod], itemsToPay, discount,
                split === 'amount' ? amountValue : undefined);
            const remainingAfter = round2(due - chargeBase);
            setSelectedQuantities({});
            resetDiscount();
            setAmountInput('');
            const paidMessage = discountValue > 0 ? `Ödeme tamamlandı! (₺${formatPrice(netAmount)})` : 'Ödeme tamamlandı!';
            if (fullyPaid) {
                toast.success(paidMessage);
                onComplete(displayOrder.id);
            } else {
                toast.success(split === 'amount'
                    ? `₺${formatPrice(netAmount)} alındı, kalan ₺${formatPrice(remainingAfter)} için masa açık kalıyor.`
                    : 'Kısmi ödeme alındı, kalan tutar için masa açık kalıyor.');
                const refreshed = await orderService.getOrderByTableId(displayOrder.tableId);
                if (refreshed) setDisplayOrder(refreshed);
                onPartialPayment?.();
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ödeme tamamlanamadı.'));
        } finally {
            setSubmitting(false);
        }
    };

    // QR içeriği düz metin: müşteri telefonla tarayıp IBAN'ı ve açıklamayı kopyalayabilir.
    const shortOrderId = String(displayOrder.id).replace(/-/g, '').slice(0, 6).toUpperCase();
    // Admin Masalar ekranından gelen siparişte masa adı boş olabilir.
    const transferDescription = displayOrder.tableName ? `${displayOrder.tableName} · #${shortOrderId}` : `Sipariş #${shortOrderId}`;
    const ibanQrText = ibanSettings && hasIban
        ? [
            `IBAN: ${ibanSettings.ibanFormatted || ibanSettings.iban}`,
            `Alıcı: ${ibanSettings.accountHolderName}`,
            `Tutar: ${formatAmount(netAmount)} TL`,
            `Açıklama: ${transferDescription}`,
        ].join('\n')
        : '';
    const isAdmin = ['Admin', 'Owner'].includes(getSession()?.role ?? '');

    const copyIban = async () => {
        if (!ibanSettings?.iban) return;
        try {
            await navigator.clipboard.writeText(ibanSettings.iban);
            toast.success('IBAN kopyalandı.');
        } catch {
            toast.error('IBAN kopyalanamadı.');
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
                                            disabled={selectedQty === 0 || itemsLocked}
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
                                            disabled={itemsLocked}
                                            onChange={(e) => setSelectionValue(item.id, item.quantity, e.target.valueAsNumber)}
                                            aria-label={`${item.productName}: bu ödemede ödenecek adet`}
                                            className={`w-9 text-center text-sm font-semibold tabular-nums bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${selectedQty > 0 ? 'text-rb-accent' : 'text-muted-foreground'}`}
                                        />
                                        <button
                                            onClick={() => adjustSelection(item.id, item.quantity, 1)}
                                            disabled={selectedQty >= item.quantity || itemsLocked}
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
                        {(hasSelection || discountValue > 0 || split === 'amount' || paidOnAccount > 0) && (
                            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                Sipariş toplamı ₺{formatPrice(displayOrder.totalPrice)}
                            </p>
                        )}
                        {paidOnAccount > 0 && (
                            <p className="mt-0.5 text-sm font-semibold tabular-nums">
                                <span className="text-rb-green">Ödenen ₺{formatPrice(paidOnAccount)}</span>
                                <span className="text-muted-foreground"> · </span>
                                <span className="text-foreground">Kalan ₺{formatPrice(due)}</span>
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
                        <div className="space-y-2">
                            <div role="tablist" aria-label="Bölme" className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
                                {SPLITS.map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={split === key}
                                        disabled={key === 'items' && itemsLocked}
                                        onClick={() => chooseSplit(key)}
                                        className={`h-10 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                            split === key ? 'bg-rb-accent text-rb-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {itemsLocked && (
                                <p className="text-xs text-muted-foreground">
                                    Bu hesaptan ₺{formatPrice(paidOnAccount)} tutar girilerek ödendi; kalan, tutar girerek ya da tamamıyla ödenir.
                                </p>
                            )}
                            {split === 'items' && !hasSelection && (
                                <p className="text-xs text-muted-foreground">Bu ödemede ödenecek ürünlerin adedini soldan seçin.</p>
                            )}
                            {split === 'amount' && (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base font-semibold text-muted-foreground" aria-hidden="true">₺</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={amountInput}
                                            onChange={e => setAmountInput(e.target.value.replace(/[^\d.,]/g, ''))}
                                            placeholder={formatPrice(due)}
                                            aria-label="Bu ödemede alınacak tutar"
                                            aria-invalid={amountTooHigh}
                                            className={`w-full rounded-lg border bg-muted/50 py-2.5 pr-3 pl-8 text-lg font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-rb-accent ${amountTooHigh ? 'border-rb-red' : 'border-border'}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {AMOUNT_CHIPS.map(([label, parts]) => {
                                            const value = round2(due / parts);
                                            const on = amountInput !== '' && amountValue === value;
                                            return (
                                                <button
                                                    key={label}
                                                    type="button"
                                                    aria-pressed={on}
                                                    aria-label={parts === 1 ? `Kalanın tamamı, ₺${formatPrice(value)}` : `Kalanın ${label} kadarı, ₺${formatPrice(value)}`}
                                                    onClick={() => setAmountInput(String(value).replace('.', ','))}
                                                    className={`flex min-h-11 flex-col items-center justify-center rounded-lg border text-sm font-semibold leading-tight transition-colors ${
                                                        on ? 'border-rb-accent bg-rb-accent-bg text-rb-accent' : 'border-border text-foreground hover:bg-muted'
                                                    }`}
                                                >
                                                    <span>{label}</span>
                                                    <span className="text-[11px] font-medium tabular-nums text-muted-foreground">₺{formatPrice(value)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className={`text-xs ${amountTooHigh ? 'font-semibold text-rb-red' : 'text-muted-foreground'}`}>
                                        {amountTooHigh
                                            ? `Kalan tutardan (₺${formatPrice(due)}) fazla olamaz.`
                                            : 'Ürünler masada kalır, tutar kalandan düşer. Kalan 0 olunca hesap kapanır. İndirim, kalanı kapatırken uygulanır.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {discountAllowed && (
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
                        )}

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

                        <div className="grid grid-cols-4 gap-2">
                            {PAYMENT_METHODS.map(({ key, label, icon, selectedClass }) => {
                                const disabled = key === 'iban' && !hasIban;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setPaymentMethod(key)}
                                        disabled={disabled}
                                        title={disabled ? 'IBAN tanımlı değil' : undefined}
                                        className={`flex h-14 items-center justify-center gap-1.5 rounded-xl border-[1.5px] px-1 text-[15px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                            paymentMethod === key ? selectedClass : 'border-border text-muted-foreground hover:border-muted-foreground'
                                        }`}
                                    >
                                        {icon}
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        {!hasIban && ibanSettings !== null && (
                            <p className="text-xs text-muted-foreground">
                                IBAN ile ödeme kapalı: şubede IBAN tanımlı değil. {isAdmin ? 'Restoran sayfasından ekleyebilirsin.' : 'Yöneticiniz Restoran ayarlarından ekleyebilir.'}
                            </p>
                        )}

                        {paymentMethod === 'iban' && hasIban && ibanSettings && (
                            <div className="rounded-xl border border-rb-purple/40 bg-rb-purple-bg p-4 space-y-3">
                                <div className="flex justify-center">
                                    <div className="rounded-lg bg-white p-2.5">
                                        <QRCodeSVG value={ibanQrText} size={168} aria-label="IBAN bilgisi QR kodu" />
                                    </div>
                                </div>
                                <dl className="space-y-1 text-sm">
                                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">IBAN</dt><dd className="font-mono text-[13px] text-foreground text-right">{ibanSettings.ibanFormatted || ibanSettings.iban}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Alıcı</dt><dd className="text-foreground text-right">{ibanSettings.accountHolderName}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Tutar</dt><dd className="font-semibold text-foreground tabular-nums">₺{formatAmount(netAmount)}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Açıklama</dt><dd className="text-foreground text-right">{transferDescription}</dd></div>
                                </dl>
                                <button
                                    type="button"
                                    onClick={copyIban}
                                    className="flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                                >
                                    <Copy className="h-4 w-4" aria-hidden="true" />
                                    IBAN'ı kopyala
                                </button>
                                <p className="text-xs text-muted-foreground">Havale hesaba geçince aşağıdan onaylayın; ödeme IBAN olarak kaydedilir, kasadaki nakde eklenmez.</p>
                            </div>
                        )}

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
                                : paymentMethod === 'iban'
                                    ? `Havale geldi, onayla (₺${formatPrice(netAmount)})`
                                    : split === 'amount'
                                    ? (amountTooHigh ? 'Tutar kalandan fazla' : amountValue > 0 ? `Tutarı Öde (₺${formatPrice(netAmount)})` : 'Tutar girin')
                                    : split === 'items'
                                    ? (hasSelection ? `Seçilenleri Öde (₺${formatPrice(netAmount)})` : 'Ürün seçin')
                                    : paidOnAccount > 0
                                    ? `Kalanı Öde (₺${formatPrice(netAmount)})`
                                    : `Tümünü Öde (₺${formatPrice(netAmount)})`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
