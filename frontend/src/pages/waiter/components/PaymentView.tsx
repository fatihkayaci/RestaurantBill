import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Check, ChevronLeft, ChevronRight, Copy, CreditCard, Landmark, Lock, Store } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { paymentService } from '@/features/cashier/api/paymentService';
import { paymentSettingsService, type BranchPaymentSettings } from '@/features/branches/api/paymentSettingsService';
import { orderService } from '@/features/orders/api/orderService';
import type { OpenRegister } from '@/features/cashier/types';
import type { Order } from '@/features/orders/types';
import type { Table } from '@/features/tables/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import BottomSheet from './BottomSheet';
import { clockTime, readStoredRegister, shortName, storeRegister } from '../waiterUi';

/** normal: ödeme · discount: indirim alanı açık · ikram: seçilen ürünler %100 indirimle kapanır. */
export type PaymentMode = 'normal' | 'discount' | 'ikram';

type Method = 'cash' | 'card' | 'iban';
const METHOD_VALUE: Record<Method, number> = { card: 1, cash: 2, iban: 4 };

/** Tamamı: kalan hesap · Ürün seç: seçilen kalemler · Tutar gir: ürün seçmeden belirli bir tutar (ürünler masada kalır). */
type Split = 'full' | 'items' | 'amount';
const SPLITS: [Split, string][] = [['full', 'Tamamı'], ['items', 'Ürün seç'], ['amount', 'Tutar gir']];
const AMOUNT_CHIPS: [string, number][] = [['½', 2], ['⅓', 3], ['¼', 4], ['Kalan', 1]];
const round2 = (value: number) => Math.round(value * 100) / 100;

interface Props {
    table: Table;
    order: Order;
    mode: PaymentMode;
    /** İndirim/ikram yetkisi (canCancelAndDiscount). */
    canDiscount: boolean;
    onBack: () => void;
    /** fullyPaid: masa kapandı. Kısmi ödemede sipariş yenilenir. */
    onPaid: (fullyPaid: boolean) => void;
    onRequestBill: () => void;
}

// "Gün: Ayşe Y." — günün sahibi (kasayı açan/atanan kişi).
function personDay(register: OpenRegister): string {
    const name = shortName(register.shiftOwnerName);
    return name ? `gün: ${name}` : 'açık gün';
}

// Telefon · Ödeme al. Ödeme seçilen kasanın açık gününe (vardiyasına) yazılır; ödemeyi alan kişi garsondur.
export default function PaymentView({ table, order, mode, canDiscount, onBack, onPaid, onRequestBill }: Props) {
    const [registers, setRegisters] = useState<OpenRegister[] | null>(null);
    const [registerId, setRegisterId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [iban, setIban] = useState<BranchPaymentSettings | null>(null);
    const [current, setCurrent] = useState<Order>(order);

    // Tutar girerek ödeme alınmış hesapta ürün seçilemez; ikram da kalan hesabın tamamına uygulanır.
    const [split, setSplit] = useState<Split>(mode === 'ikram' && !(order.paidAmount ?? 0) ? 'items' : 'full');
    const [selected, setSelected] = useState<Record<number, number>>({});
    const [amountInput, setAmountInput] = useState('');
    const [method, setMethod] = useState<Method>('cash');
    const [received, setReceived] = useState<number | 'exact'>('exact');
    const [customReceived, setCustomReceived] = useState('');
    const [discountOpen, setDiscountOpen] = useState(mode !== 'normal');
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [discountInput, setDiscountInput] = useState(mode === 'ikram' ? '100' : '');
    const [discountNote, setDiscountNote] = useState(mode === 'ikram' ? 'İkram' : '');
    const [submitting, setSubmitting] = useState(false);

    const loadRegisters = useCallback(() => {
        shiftService.getOpenRegisters()
            .then(list => {
                setRegisters(list);
                setRegisterId(prev => {
                    if (prev && list.some(r => r.cashRegisterId === prev)) return prev;
                    if (list.length === 1) return list[0].cashRegisterId;
                    const stored = readStoredRegister();
                    return stored && list.some(r => r.cashRegisterId === stored) ? stored : null;
                });
            })
            .catch(err => {
                setRegisters([]);
                toast.error(getApiErrorMessage(err, 'Açık kasalar alınamadı.'));
            });
    }, []);

    useEffect(() => {
        loadRegisters();
        paymentSettingsService.get().then(setIban).catch(() => setIban(null));
    }, [loadRegisters]);

    // Açık kasa yokken ekran beklemede kalır; gün açılınca kendiliğinden devam eder.
    useEffect(() => {
        if (registers === null || registers.length > 0) return;
        const id = setInterval(loadRegisters, 10000);
        return () => clearInterval(id);
    }, [registers, loadRegisters]);

    // Sipariş dışarıdan değişirse (başka cihazdan ürün eklendi) güncel hali kullanılır.
    const [prevOrder, setPrevOrder] = useState(order);
    if (order !== prevOrder) {
        setPrevOrder(order);
        setCurrent(order);
        setSelected({});
        if ((order.paidAmount ?? 0) > 0 && split === 'items') setSplit('full');
    }

    const register = registers?.find(r => r.cashRegisterId === registerId) ?? null;
    const multi = (registers?.length ?? 0) > 1;
    const hasIban = !!iban?.iban;
    const ikram = mode === 'ikram';

    const items = current.orderItems;
    const paid = current.paidAmount ?? 0;
    const due = current.remainingAmount ?? current.totalPrice;
    const itemsLocked = paid > 0;
    const selectedTotal = items.reduce((sum, i) => sum + (selected[i.id] ?? 0) * i.unitPrice, 0);
    const amountValue = round2(parseFloat(amountInput.replace(',', '.')) || 0);
    const amountTooHigh = split === 'amount' && amountValue > due;
    const base = split === 'full' ? due : split === 'items' ? selectedTotal : Math.min(amountValue, due);
    // İndirim/ikram yalnızca ürünlerle kapanan ödemede: tutar girilen ödeme olduğu gibi tahsil edilir.
    const discountAllowed = canDiscount && split !== 'amount';
    const discountRaw = parseFloat(discountInput.replace(',', '.')) || 0;
    const discount = discountAllowed && discountOpen
        ? Math.min(discountType === 'percent' ? base * Math.min(discountRaw, 100) / 100 : discountRaw, base)
        : 0;
    const net = Math.max(0, Math.round((base - discount) * 100) / 100);
    const remaining = Math.max(0, round2(due - base));

    const toggleItem = (id: number, quantity: number) => {
        setSelected(prev => ({ ...prev, [id]: prev[id] ? 0 : quantity }));
    };
    const stepItem = (id: number, quantity: number, delta: number) => {
        setSelected(prev => ({ ...prev, [id]: Math.min(quantity, Math.max(0, (prev[id] ?? 0) + delta)) }));
    };

    const cashOptions = useMemo(() => {
        if (net <= 0) return [];
        const next100 = Math.floor(net / 100) * 100 + 100;
        const next500 = Math.floor(net / 500) * 500 + 500;
        const values = [next100, next100 + 100, next500, next500 + 500];
        return [...new Set(values)].filter(v => v > net).sort((a, b) => a - b).slice(0, 3);
    }, [net]);
    const receivedAmount = customReceived
        ? parseFloat(customReceived.replace(',', '.')) || 0
        : received === 'exact' ? net : received;
    const change = Math.max(0, receivedAmount - net);
    const cashShort = method === 'cash' && net > 0 && receivedAmount < net;

    const ibanText = iban && hasIban
        ? [
            `IBAN: ${iban.ibanFormatted || iban.iban}`,
            `Alıcı: ${iban.accountHolderName}`,
            `Tutar: ${formatAmount(net)} TL`,
            `Açıklama: ${table.name} · #${String(current.id).replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        ].join('\n')
        : '';

    const canConfirm = !submitting && !!register && base > 0 && !amountTooHigh && !cashShort && (method !== 'iban' || hasIban || net === 0);

    const confirm = async () => {
        if (!register || !canConfirm) return;
        const payItems = split === 'amount'
            ? []
            : split === 'full'
                ? items.map(i => ({ orderItemId: i.id, quantity: i.quantity }))
                : items.filter(i => (selected[i.id] ?? 0) > 0).map(i => ({ orderItemId: i.id, quantity: selected[i.id] }));
        const hasDiscount = discountAllowed && discountOpen && discount > 0;
        try {
            setSubmitting(true);
            const fullyPaid: boolean = await paymentService.createPayment(
                current.id,
                register.cashRegisterId,
                net === 0 ? METHOD_VALUE.cash : METHOD_VALUE[method],
                payItems,
                hasDiscount
                    ? {
                        percent: discountType === 'percent' ? Math.min(discountRaw, 100) : undefined,
                        amount: discountType === 'amount' ? discount : undefined,
                        note: discountNote || undefined,
                    }
                    : undefined,
                split === 'amount' ? amountValue : undefined,
            );
            const remainingNote = !fullyPaid && remaining > 0 ? ` · kalan ₺${formatPrice(remaining)}` : '';
            if (net === 0) toast.success('İkram kaydedildi.');
            else toast.success(method === 'cash' && change > 0
                ? `₺${formatPrice(net)} alındı · para üstü ₺${formatPrice(change)}${remainingNote}`
                : `₺${formatPrice(net)} ödeme alındı${remainingNote}.`);
            if (fullyPaid) {
                onPaid(true);
                return;
            }
            const refreshed = await orderService.getOrderByTableId(String(table.id));
            if (refreshed) setCurrent(refreshed);
            setSelected({});
            setAmountInput('');
            setCustomReceived('');
            setReceived('exact');
            onPaid(false);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ödeme alınamadı.'));
            loadRegisters();
        } finally {
            setSubmitting(false);
        }
    };

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const title = ikram ? 'İkram et' : 'Ödeme al';

    const header = (
        <header className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-2">
            <button
                type="button"
                onClick={onBack}
                aria-label={`${table.name} masasına dön`}
                className="-ml-2 flex size-12 items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
                <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-medium text-rb-text-sub">{table.name} · {itemCount} ürün</span>
                <h2 className="font-serif text-[28px] font-bold leading-none text-foreground">{title}</h2>
            </div>
        </header>
    );

    if (registers === null) {
        return (
            <div className="flex h-full flex-col bg-[#F5F0E8] dark:bg-background">
                {header}
                <div className="flex flex-1 items-center justify-center text-sm text-rb-text-sub">Kasalar yükleniyor…</div>
            </div>
        );
    }

    if (registers.length === 0) {
        return (
            <div className="flex h-full flex-col bg-[#F5F0E8] dark:bg-background">
                {header}
                <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                    <span className="flex size-18 items-center justify-center rounded-full bg-rb-red-bg text-rb-red" aria-hidden="true">
                        <Lock className="size-8" />
                    </span>
                    <h3 className="font-serif text-[28px] font-bold leading-tight text-foreground">Açık kasa yok</h3>
                    <p className="max-w-80 text-base text-rb-text-sub">
                        Ödeme alınamıyor, kasiyere ya da yöneticiye haber verin. Ödeme bir kasanın açık gününe yazılır;
                        gün açılınca bu ekran kendiliğinden açılır.
                    </p>
                    <div className="mt-2 flex w-full max-w-80 flex-col gap-2.5">
                        {!ikram && (
                            <button
                                type="button"
                                onClick={onRequestBill}
                                className="h-14 rounded-2xl bg-foreground text-base font-bold text-background"
                            >
                                {current.billRequestedAt ? 'Kasaya yeniden bildir' : 'Hesap iste · kasaya bildir'}
                            </button>
                        )}
                        <button type="button" onClick={onBack} className="h-14 rounded-2xl border border-border bg-card text-base font-semibold text-foreground">
                            Masaya dön
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const confirmLabel = submitting
        ? 'İşleniyor…'
        : !register ? 'Önce kasa seçin'
            : amountTooHigh ? 'Tutar kalandan fazla'
            : base === 0 ? (split === 'amount' ? 'Tutar girin' : 'Ürün seçin')
                : net === 0 ? 'İkram et · ₺0'
                    : method === 'cash' ? `₺${formatPrice(net)} nakit al`
                        : method === 'card' ? `Kart ödemesi alındı · ₺${formatPrice(net)}`
                            : 'Havale geldi, onayla';

    return (
        <div className="relative flex h-full min-h-0 flex-col bg-[#F5F0E8] dark:bg-background">
            {header}
            <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1 pb-4 *:shrink-0">
                {/* Kasa */}
                <button
                    type="button"
                    onClick={() => multi && setPickerOpen(true)}
                    aria-label={register ? `Kasa: ${register.cashRegisterName}${multi ? ', değiştir' : ''}` : 'Kasa seçin'}
                    className={cn(
                        'flex min-h-15 items-center gap-3 rounded-2xl border bg-card px-3.5 py-2 text-left',
                        register ? 'border-border' : 'border-rb-amber',
                        !multi && 'cursor-default',
                    )}
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rb-gold-bg text-rb-gold" aria-hidden="true">
                        <Store className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-xs font-medium text-rb-text-sub">Kasaya yazılacak</span>
                        <span className="truncate text-[15px] font-bold text-foreground">
                            {register ? `${register.cashRegisterName} · ${personDay(register)}` : 'Kasa seçin'}
                        </span>
                    </span>
                    <span className="flex shrink-0 items-center text-[13px] font-semibold text-rb-text-sub">
                        {multi ? <>Değiştir<ChevronRight className="size-4" aria-hidden="true" /></> : 'Tek açık kasa'}
                    </span>
                </button>

                {/* Tutar */}
                <div className="flex flex-col items-center rounded-2xl bg-foreground px-4 py-3.5 text-background">
                    <span className="text-[13px] opacity-75">Bu ödemede</span>
                    <span className="font-serif text-[40px] font-bold leading-tight tabular-nums">₺{formatPrice(net)}</span>
                    <span className="text-[13px] opacity-75">
                        {discount > 0 && `₺${formatPrice(discount)} ${ikram && discountRaw >= 100 ? 'ikram' : 'indirim'} · `}
                        {remaining > 0
                            ? `Masada kalan ₺${formatPrice(remaining)} · ${paid > 0 ? `ödenen ₺${formatPrice(paid)}` : `toplam ₺${formatPrice(current.totalPrice)}`}`
                            : paid > 0 ? `Kalanın tamamı · ödenen ₺${formatPrice(paid)} · masa kapanır` : 'Hesabın tamamı · masa kapanır'}
                    </span>
                </div>

                {/* Bölme */}
                <div role="tablist" aria-label="Bölme" className="grid grid-cols-3 gap-1 rounded-2xl bg-[#EBE3D5] p-1 dark:bg-muted">
                    {SPLITS.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={split === key}
                            disabled={key === 'items' && itemsLocked}
                            onClick={() => setSplit(key)}
                            className={cn(
                                'min-h-11 rounded-xl text-sm font-semibold disabled:opacity-40',
                                split === key ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(42,31,20,0.15)]' : 'text-rb-text-sub',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {itemsLocked && (
                    <p className="-mt-1 text-[13px] text-rb-text-sub">
                        Bu hesaptan ₺{formatPrice(paid)} tutar girilerek ödendi; kalan, tutar girerek ya da tamamıyla ödenir.
                    </p>
                )}

                {split === 'amount' && (
                    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-sm font-semibold text-rb-text-sub">Bu ödemede alınacak tutar</span>
                            <span className="relative">
                                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-lg font-bold text-rb-text-sub" aria-hidden="true">₺</span>
                                <input
                                    inputMode="decimal"
                                    value={amountInput}
                                    onChange={e => setAmountInput(e.target.value.replace(/[^\d.,]/g, ''))}
                                    placeholder={formatPrice(due)}
                                    aria-label="Ödenecek tutar"
                                    aria-invalid={amountTooHigh}
                                    className={cn(
                                        'h-13 w-full rounded-xl border bg-background pr-3 pl-9 text-xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-rb-gold',
                                        amountTooHigh ? 'border-rb-red' : 'border-border',
                                    )}
                                />
                            </span>
                        </label>
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
                                        className={cn(
                                            'flex min-h-12 flex-col items-center justify-center rounded-xl border text-sm font-bold leading-tight',
                                            on ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground',
                                        )}
                                    >
                                        <span>{label}</span>
                                        <span className={cn('text-[11px] font-semibold tabular-nums', on ? 'opacity-80' : 'text-rb-text-sub')}>₺{formatPrice(value)}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className={cn('text-[13px]', amountTooHigh ? 'font-semibold text-rb-red' : 'text-rb-text-sub')}>
                            {amountTooHigh
                                ? `Kalan tutardan (₺${formatPrice(due)}) fazla olamaz.`
                                : 'Ürünler masada kalır, tutar kalandan düşer. Kalan 0 olunca masa kapanır.'}
                        </p>
                    </div>
                )}

                {split === 'items' && (
                    <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                        {items.map((item, idx) => {
                            const qty = selected[item.id] ?? 0;
                            return (
                                <li key={item.id} className={cn('flex items-center gap-2 pr-2', idx > 0 && 'border-t border-border')}>
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={qty > 0}
                                        onClick={() => toggleItem(item.id, item.quantity)}
                                        className="flex min-h-13 min-w-0 flex-1 items-center gap-3 px-3.5 py-2 text-left"
                                    >
                                        <span
                                            className={cn(
                                                'flex size-5.5 shrink-0 items-center justify-center rounded-md border-[1.5px]',
                                                qty > 0 ? 'border-foreground bg-foreground text-background' : 'border-[#B9AA90] bg-card',
                                            )}
                                            aria-hidden="true"
                                        >
                                            {qty > 0 && <Check className="size-3.5" strokeWidth={3} />}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-[15px] text-foreground">{item.quantity}× {item.productName}</span>
                                        <span className="shrink-0 text-[15px] font-semibold tabular-nums">₺{formatPrice(item.unitPrice * item.quantity)}</span>
                                    </button>
                                    {qty > 0 && item.quantity > 1 && (
                                        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-0.5">
                                            <button type="button" onClick={() => stepItem(item.id, item.quantity, -1)} aria-label={`${item.productName}: bu ödemede bir adet az`} className="flex size-9 items-center justify-center rounded-full text-lg font-bold">−</button>
                                            <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
                                            <button type="button" onClick={() => stepItem(item.id, item.quantity, 1)} aria-label={`${item.productName}: bu ödemede bir adet fazla`} className="flex size-9 items-center justify-center rounded-full text-lg font-bold">+</button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* İndirim / ikram */}
                {discountAllowed && (
                    discountOpen ? (
                        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-foreground">{ikram ? 'İkram' : 'İndirim'}</span>
                                <button type="button" onClick={() => { setDiscountOpen(false); setDiscountInput(''); }} className="min-h-9 px-2 text-[13px] font-semibold text-rb-text-sub">Kaldır</button>
                            </div>
                            <div className="flex gap-2">
                                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                                    {([['percent', '%'], ['amount', '₺']] as const).map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            aria-pressed={discountType === key}
                                            onClick={() => { setDiscountType(key); setDiscountInput(''); }}
                                            className={cn('h-10 w-11 rounded-lg text-base font-bold', discountType === key ? 'bg-card text-foreground' : 'text-rb-text-sub')}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    inputMode="decimal"
                                    value={discountInput}
                                    onChange={e => setDiscountInput(e.target.value.replace(/[^\d.,]/g, ''))}
                                    placeholder={discountType === 'percent' ? 'Yüzde' : 'Tutar'}
                                    aria-label={discountType === 'percent' ? 'İndirim yüzdesi' : 'İndirim tutarı'}
                                    className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-rb-gold"
                                />
                            </div>
                            <input
                                value={discountNote}
                                onChange={e => setDiscountNote(e.target.value)}
                                maxLength={300}
                                placeholder="Açıklama (ör. müdavim, gecikme)"
                                aria-label="İndirim açıklaması"
                                className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-rb-gold"
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setDiscountOpen(true)}
                            className="min-h-11 self-start rounded-full border border-dashed border-border px-4 text-sm font-semibold text-rb-text-sub"
                        >
                            + İndirim / ikram
                        </button>
                    )
                )}

                {/* Yöntem */}
                {net > 0 && (
                    <>
                        <div role="radiogroup" aria-label="Ödeme yöntemi" className="grid grid-cols-3 gap-2">
                            {([
                                ['cash', 'Nakit', <Banknote key="i" className="size-5.5" aria-hidden="true" />, 'border-rb-green bg-rb-green-bg text-rb-green'],
                                ['card', 'Kart', <CreditCard key="i" className="size-5.5" aria-hidden="true" />, 'border-rb-accent bg-rb-accent-bg text-rb-accent'],
                                ['iban', 'IBAN', <Landmark key="i" className="size-5.5" aria-hidden="true" />, 'border-rb-purple bg-rb-purple-bg text-rb-purple'],
                            ] as const).map(([key, label, icon, on]) => {
                                const disabled = key === 'iban' && !hasIban;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        role="radio"
                                        aria-checked={method === key}
                                        disabled={disabled}
                                        onClick={() => setMethod(key)}
                                        className={cn(
                                            'flex min-h-17 flex-col items-center justify-center gap-1 rounded-2xl text-[15px] font-bold disabled:opacity-45',
                                            method === key ? `border-2 ${on}` : 'border border-border bg-card text-foreground',
                                        )}
                                    >
                                        {icon}{label}
                                    </button>
                                );
                            })}
                        </div>
                        {!hasIban && iban !== null && (
                            <p className="-mt-1 text-[13px] text-rb-text-sub">IBAN tanımlı değil; yönetici Restoran ayarlarından ekleyebilir.</p>
                        )}

                        {method === 'cash' && (
                            <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-3.5">
                                <span className="text-sm font-semibold text-rb-text-sub">Müşteriden alınan</span>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {(['exact', ...cashOptions] as const).map(value => {
                                        const on = !customReceived && received === value;
                                        return (
                                            <button
                                                key={String(value)}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() => { setReceived(value); setCustomReceived(''); }}
                                                className={cn(
                                                    'min-h-11 rounded-xl border text-sm font-bold',
                                                    on ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground',
                                                )}
                                            >
                                                {value === 'exact' ? 'Tam' : `₺${formatPrice(value)}`}
                                            </button>
                                        );
                                    })}
                                </div>
                                <input
                                    inputMode="decimal"
                                    value={customReceived}
                                    onChange={e => setCustomReceived(e.target.value.replace(/[^\d.,]/g, ''))}
                                    placeholder="Başka tutar"
                                    aria-label="Müşteriden alınan tutar"
                                    className="h-11 rounded-xl border border-border bg-background px-3 text-base outline-none focus:ring-2 focus:ring-rb-gold"
                                />
                                <div className="flex items-center justify-between border-t border-border pt-2.5">
                                    <span className="text-[15px] font-semibold text-foreground">Para üstü</span>
                                    <span className={cn('text-xl font-bold tabular-nums', cashShort ? 'text-rb-red' : 'text-rb-green')}>
                                        {cashShort ? 'Tutar eksik' : `₺${formatPrice(change)}`}
                                    </span>
                                </div>
                            </div>
                        )}

                        {method === 'card' && (
                            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-[15px] text-foreground">
                                <CreditCard className="size-6 shrink-0 text-rb-accent" aria-hidden="true" />
                                <span>POS cihazından <strong>₺{formatPrice(net)}</strong> çekin. Slip çıkınca aşağıdan onaylayın.</span>
                            </div>
                        )}

                        {method === 'iban' && hasIban && iban && (
                            <div className="flex gap-3.5 rounded-2xl border border-border bg-card p-3.5">
                                <div className="shrink-0 rounded-xl bg-white p-2" role="img" aria-label="IBAN bilgisi QR kodu">
                                    <QRCodeSVG value={ibanText} size={112} level="M" />
                                </div>
                                <div className="flex min-w-0 flex-col gap-1">
                                    <span className="text-[13px] text-rb-text-sub">Müşteri telefonuyla okutsun</span>
                                    <span className="text-[15px] font-bold text-foreground">{iban.accountHolderName}</span>
                                    <span className="text-[13px] break-all text-foreground tabular-nums">{iban.ibanFormatted || iban.iban}</span>
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(iban.iban).then(() => toast.success('IBAN kopyalandı.'), () => toast.error('IBAN kopyalanamadı.'))}
                                        className="mt-1 inline-flex min-h-10 items-center gap-1.5 self-start rounded-full border border-border px-3 text-[13px] font-semibold"
                                    >
                                        <Copy className="size-3.5" aria-hidden="true" />IBAN'ı kopyala
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={register ? confirm : () => setPickerOpen(true)}
                    disabled={register ? !canConfirm : false}
                    className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-[17px] font-bold text-background disabled:opacity-50"
                >
                    <Check className="size-5.5" aria-hidden="true" />
                    {confirmLabel}
                </button>
            </div>

            {pickerOpen && registers && (
                <BottomSheet label="Kasa seç" onClose={() => setPickerOpen(false)}>
                    <h3 className="px-2 pb-1 font-serif text-[22px] font-bold text-foreground">Hangi kasaya yazılsın?</h3>
                    {registers.map(r => {
                        const on = r.cashRegisterId === registerId;
                        return (
                            <button
                                key={r.cashRegisterId}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => { setRegisterId(r.cashRegisterId); storeRegister(r.cashRegisterId); setPickerOpen(false); }}
                                className={cn(
                                    'flex min-h-15 items-center gap-3 rounded-2xl bg-background px-3.5 py-2 text-left',
                                    on ? 'border-2 border-foreground' : 'border border-border',
                                )}
                            >
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-base font-bold text-foreground">{r.cashRegisterName}</span>
                                    <span className="text-[13px] text-rb-text-sub">{personDay(r)} · {clockTime(r.openedAt)}'de açıldı</span>
                                </span>
                                <span className={cn('size-5 shrink-0 rounded-full', on ? 'border-[6px] border-foreground' : 'border-2 border-[#B9AA90]')} aria-hidden="true" />
                            </button>
                        );
                    })}
                    <span className="px-2 pt-1 text-[13px] text-rb-text-sub">Seçim bu cihazda hatırlanır. Tek açık kasa varsa sorulmaz.</span>
                </BottomSheet>
            )}
        </div>
    );
}
