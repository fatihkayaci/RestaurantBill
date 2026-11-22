import { useState, useEffect } from 'react';
import { X, ChevronDown, Tag, Gift, Users, Info, Wallet, ReceiptText, CheckCircle2, Store } from 'lucide-react';
import { paymentSettingsService, type BranchPaymentSettings } from '@/features/branches/api/paymentSettingsService';
import { getSession } from '@/lib/auth';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { describeLineDiscount, type BillLine } from '@/features/cashier/billLines';
import { METHOD_LABEL, readLastRegister, toKurus, writeLastRegister, type PaymentMethod } from '@/features/cashier/paymentMath';
import { usePaymentSession } from '@/features/cashier/usePaymentSession';
import { productService } from '@/features/products/api/productService';
import { TakeawayBadge } from '@/features/orders/components/TakeawayBadge';
import type { Order } from '@/features/orders/types';
import type { Shift, ShiftStartCandidate } from '@/features/cashier/types';
import { useActiveShift } from '@/features/cashier/context/activeShiftStore';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatAmount, formatPrice, formatElapsed } from '@/lib/format';
import PaymentDiscountEditor, { DiscountIcon, StagedDiscountList } from './PaymentDiscountEditor';
import PaymentDialog from './PaymentDialog';
import PaymentSplitDialog, { type SplitTab } from './PaymentSplitDialog';
import { CardPanel, CashPanel, IbanPanel, MethodCards, QrPanel } from './PaymentMethodPanels';

export type { PaymentMethod };

const clockTime = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
// Ürün görselleri GET /product'tan gelir; bu uç kasiyere kapalı, kasiyer ekranında baş harf gösterilir.
const PRODUCT_LIST_ROLES = ['Owner', 'Admin', 'Waiter'];

interface Props {
    order: Order;
    onClose: () => void;
    onComplete: (orderId: number) => void;
    /** shift: kasiyer kendi vardiyasının kasasına alır · manual: yönetici kasa seçer (kasa seçimi yalnızca bu modda). */
    cashRegisterMode?: 'shift' | 'manual';
    /** Kısmi ödeme sonrası (masa açık kalır) üst ekrandaki listeyi tazelemek için. */
    onPartialPayment?: () => void;
    /** Kasiyerin indirim/ikram yetkisi ve indirim sınırı (100 = sınırsız). Admin ekranında verilmez, kısıt yoktur. */
    canDiscount?: boolean;
    maxDiscountPercent?: number;
    /**
     * Hesap isteğinden gelecek ipuçları için (müşterinin istediği kişi sayısı / ödeme yöntemi). Verilirse ekran
     * eşit bölme ve yöntem önceden seçili açılır; kasiyer istediği an değiştirebilir.
     */
    initialPeople?: number;
    initialMethod?: PaymentMethod;
}

/** Kalemin küçük görseli; görsel yoksa (ya da yüklenemezse) adın baş harfi. */
function LineThumb({ name, src }: { name: string; src?: string }) {
    const [failed, setFailed] = useState(false);
    if (src && !failed) {
        return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
    }
    return (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted font-serif text-lg font-bold text-muted-foreground" aria-hidden="true">
            {name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'}
        </span>
    );
}

export default function PaymentPanel({
    order, onClose, onComplete, cashRegisterMode = 'shift', onPartialPayment, canDiscount = true, maxDiscountPercent = 100,
    initialPeople: initialPeopleProp, initialMethod: initialMethodProp,
}: Props) {
    const session = getSession();
    // Ortak ödeme durumu (bölme, bekleyen indirimler, tutar, yöntem, gönderim): garson ekranıyla aynı kurallar.
    const pay = usePaymentSession({
        order, canDiscount, maxDiscountPercent, initialPeople: initialPeopleProp, initialMethod: initialMethodProp,
    });
    const {
        displayOrder, lines, paidOnAccount, due, itemsLocked, staged, lineDiscounts, bill, closingPlan, closingItemDiscount,
        afterItems, billDiscount, closingDiscount, remainingNet, hasStagedDiscount, split, people, splitPaid, peopleLeft,
        personShare, lastShare, selectedQuantities, selectedCount, coversAll, itemsDiscount, customAmount,
        payKind, net, restAfter, paymentMethod, setPaymentMethod, receivedInput, setReceivedInput, change, cashShort, log,
        unloggedOnAccount, paidTotal, methodNeeded, submitting,
    } = pay;
    const [discountOpen, setDiscountOpen] = useState(false);
    const [splitDialog, setSplitDialog] = useState<SplitTab | null>(null);

    const { shift: cashierActiveShift } = useActiveShift();
    const [manualShift, setManualShift] = useState<Shift | null>(null);
    const [cashRegisters, setCashRegisters] = useState<ShiftStartCandidate[]>([]);
    const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<string>('');
    const [loadingCashRegisters, setLoadingCashRegisters] = useState(cashRegisterMode === 'manual');
    const [ensuringShift, setEnsuringShift] = useState(false);
    const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
    // Şubenin IBAN'ı: yoksa IBAN seçeneği kapalıdır.
    const [ibanSettings, setIbanSettings] = useState<BranchPaymentSettings | null>(null);
    const hasIban = !!ibanSettings?.iban;
    const [productImages, setProductImages] = useState<Record<string, string>>({});

    useEffect(() => {
        paymentSettingsService.get().then(setIbanSettings).catch(() => setIbanSettings(null));
    }, []);

    useEffect(() => {
        if (!PRODUCT_LIST_ROLES.includes(getSession()?.role ?? '')) return;
        let cancelled = false;
        productService.getProducts()
            .then(products => {
                if (!cancelled) setProductImages(Object.fromEntries(products.filter(p => p.imageUrl).map(p => [p.id, p.imageUrl])));
            })
            .catch(() => { /* görsel yoksa baş harf gösterilir */ });
        return () => { cancelled = true; };
    }, []);

    const taxGroups = Object.values(
        displayOrder.orderItems.reduce((acc, item) => {
            const key = item.taxRate;
            if (!acc[key]) acc[key] = { rate: key, total: 0, categories: new Set<string>() };
            acc[key].total += item.unitPrice * item.quantity;
            if (item.categoryName) acc[key].categories.add(item.categoryName);
            return acc;
        }, {} as Record<number, { rate: number; total: number; categories: Set<string> }>)
    ).sort((a, b) => a.rate - b.rate);

    // Manuel modda hazırlanan vardiya yalnızca seçili kasaya aitse kullanılır: kasa değiştirilirken geç dönen bir
    // vardiya isteği ödemeyi önceki kasaya yazdırmasın.
    const activeShift = cashRegisterMode === 'shift'
        ? cashierActiveShift
        : manualShift?.cashRegisterId === selectedCashRegisterId ? manualShift : null;

    /** Kasada açık vardiyayı getirir; yoksa yöneticinin adına açar (ekranda önceden uyarılır). */
    const ensureRegisterShift = async (register: ShiftStartCandidate): Promise<Shift | null> => {
        setEnsuringShift(true);
        try {
            const shift = await shiftService.ensureOpen(register.cashRegisterId);
            setManualShift(shift);
            if (!register.hasOpenShift) toast.info(`${register.cashRegisterName} kasasında sizin adınıza vardiya açıldı.`);
            return shift;
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Bu kasada vardiya açılamadı.'));
            return null;
        } finally {
            setEnsuringShift(false);
        }
    };

    // Kasa seçmek vardiya açmaz: açık vardiyası olan kasa hemen hazırlanır, olmayanınki ödeme alınırken açılır.
    // Seçim kullanıcı + şube başına hatırlanır.
    const handleSelectRegister = async (registerId: string) => {
        const register = cashRegisters.find(r => r.cashRegisterId === registerId);
        if (!register || register.cashRegisterId === selectedCashRegisterId) return;
        setSelectedCashRegisterId(register.cashRegisterId);
        writeLastRegister(session?.userId, session?.restaurantId, register.cashRegisterId);
        setManualShift(null);
        if (register.hasOpenShift) await ensureRegisterShift(register);
    };

    useEffect(() => {
        if (cashRegisterMode !== 'manual') return;
        let cancelled = false;
        const { userId, restaurantId } = getSession() ?? {};
        shiftService.getStartCandidates()
            .then(registers => {
                if (cancelled) return;
                setCashRegisters(registers);
                // Son seçilen kasa gelir, yoksa ilk kasa. Açık vardiyası varsa hemen hazırlanır; yoksa vardiya ödeme
                // tamamlanırken açılır.
                const stored = readLastRegister(userId, restaurantId);
                const initial = registers.find(r => r.cashRegisterId === stored) ?? registers[0];
                if (!initial) return;
                setSelectedCashRegisterId(prev => prev || initial.cashRegisterId);
                if (initial.hasOpenShift) {
                    setEnsuringShift(true);
                    shiftService.ensureOpen(initial.cashRegisterId)
                        .then(shift => {
                            if (cancelled) return;
                            // Bu arada başka kasa seçildiyse onun vardiyasını ezme.
                            setManualShift(prev => prev ?? shift);
                        })
                        .catch(err => {
                            if (!cancelled) toast.error(getApiErrorMessage(err, 'Bu kasada vardiya açılamadı.'));
                        })
                        .finally(() => {
                            if (!cancelled) setEnsuringShift(false);
                        });
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoadingCashRegisters(false);
            });
        return () => { cancelled = true; };
    }, [cashRegisterMode]);

    const selectedRegister = cashRegisters.find(r => r.cashRegisterId === selectedCashRegisterId);
    const cashRegisterId = activeShift?.cashRegisterId;
    // Manuel modda kasa seçili ama vardiyası henüz açılmamışsa, vardiya ödeme tamamlanırken açılır.
    const hasPaymentRegister = !!cashRegisterId || (cashRegisterMode === 'manual' && !!selectedRegister);
    const willOpenShift = cashRegisterMode === 'manual' && !!selectedRegister && !selectedRegister.hasOpenShift && !activeShift;
    const registerName = cashRegisterMode === 'shift' ? activeShift?.cashRegisterName : selectedRegister?.cashRegisterName;

    // ---- Düğme: eksik bir seçim varsa kapalıdır ve neyin eksik olduğunu söyler. Önce kasa, sonra ödemenin kendisi.
    const missing: string | null =
        cashRegisterMode === 'manual' && loadingCashRegisters ? 'Kasalar yükleniyor…'
        : !hasPaymentRegister ? (cashRegisterMode === 'shift' ? 'Açık vardiyanız yok' : cashRegisters.length === 0 ? 'Açık kasa yok' : 'Kasa seçin')
        : ensuringShift ? 'Kasa hazırlanıyor…'
        : pay.missing(hasIban);
    const canComplete = !submitting && missing === null;
    const buttonTitle = submitting ? 'İşleniyor…' : missing ?? (methodNeeded ? 'Ödemeyi Tamamla' : 'İkramı kaydet');
    const buttonDetail = submitting || missing ? null
        : !methodNeeded || !paymentMethod ? 'Hesap 0 ₺ ile kapanır'
        : `${formatPrice(net)} ₺ ${METHOD_LABEL[paymentMethod]}${restAfter > 0 ? ` · sonra kalan ${formatPrice(restAfter)} ₺` : ' · hesap kapanır'}`;

    // ---- Hesabı Böl penceresinden gelen seçimler.
    const applyPeople = (count: number) => { pay.applyPeople(count); setSplitDialog(null); };
    const applyItems = (selection: Record<string, number>) => { pay.applyItems(selection); setSplitDialog(null); };
    const applyAmount = (amount: number) => { pay.applyAmount(amount); setSplitDialog(null); };
    const cancelSplit = pay.cancelSplit;
    const openSplitDialog = () => setSplitDialog(split === 'full' ? 'people' : split);

    const handleComplete = () => pay.pay(canComplete, {
        registerName,
        resolveRegister: async () => {
            let paymentRegisterId = cashRegisterId;
            if (!paymentRegisterId && cashRegisterMode === 'manual' && selectedRegister) {
                const shift = await ensureRegisterShift(selectedRegister);
                if (!shift) return null;
                paymentRegisterId = shift.cashRegisterId;
            }
            if (!paymentRegisterId) {
                toast.error(cashRegisterMode === 'shift' ? 'Ödeme almak için açık bir vardiyanız olmalı.' : 'Ödeme almak için bir kasa seçmelisiniz.');
                return null;
            }
            return paymentRegisterId;
        },
        // Ödemenin alındığı kasa, bir sonraki ödemede varsayılan gelir.
        onSuccess: registerId => { if (cashRegisterMode === 'manual') writeLastRegister(session?.userId, session?.restaurantId, registerId); },
        onFullyPaid: () => onComplete(displayOrder.id),
        onPartiallyPaid: onPartialPayment,
    });

    // Havale açıklaması: müşteri ve kasiyer ödemeyi bununla eşleştirir.
    const shortOrderId = String(displayOrder.id).replace(/-/g, '').slice(0, 6).toUpperCase();
    // Admin Masalar ekranından gelen siparişte masa adı boş olabilir.
    const transferDescription = displayOrder.tableName ? `${displayOrder.tableName} · #${shortOrderId}` : `Sipariş #${shortOrderId}`;
    const isAdmin = ['Admin', 'Owner'].includes(session?.role ?? '');

    const chipButton = 'min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
    const secondaryButton = 'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40';

    /** Kalem satırının altındaki bekleyen ürün indirimi (kaldırma toplamlar bölümünde). */
    const lineDiscountNote = (line: BillLine) => {
        const d = canDiscount ? staged.lines[line.key] : undefined;
        if (!d) return null;
        return (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-rb-red">
                <DiscountIcon ikram={d.kind === 'ikram'} />
                {d.kind === 'ikram' ? `İkram${d.quantity ? ` · ${d.quantity} adet` : ''}` : `İndirim ${describeLineDiscount(lineDiscounts[line.key], line.quantity)}`}
            </p>
        );
    };

    // ---- Sağ sütundaki bölme özeti: kasiyer neyi tahsil ettiğini her an görür.
    const splitSummary = split === 'full' ? null : (
        <div className="rounded-xl border border-rb-accent/30 bg-rb-accent-bg px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 text-sm font-semibold tabular-nums text-foreground" aria-live="polite">
                    {split === 'people' && (peopleLeft > 1
                        ? `Eşit böl · Kişi ${splitPaid + 1}/${people} · kişi başı ${formatPrice(personShare)} ₺`
                        : `Eşit böl · Son kişi ${splitPaid + 1}/${people} · ${formatPrice(personShare)} ₺`)}
                    {split === 'items' && (selectedCount > 0
                        ? `Ürünlere göre · ${selectedCount} adet seçili${coversAll ? ' · tümü' : ''}`
                        : 'Ürünlere göre · ürün seçilmedi')}
                    {split === 'amount' && `Belirli tutar · ${formatPrice(customAmount ?? 0)} ₺`}
                </p>
                <div className="-my-1 -mr-1 flex shrink-0 items-center">
                    <button type="button" onClick={openSplitDialog} className={`${chipButton} text-rb-accent hover:bg-card/60`}>Değiştir</button>
                    <button type="button" onClick={cancelSplit} className={`${chipButton} text-muted-foreground hover:bg-card/60 hover:text-foreground`}>
                        {split === 'people' ? 'Bölmeyi iptal' : 'İptal'}
                    </button>
                </div>
            </div>
            {split === 'people' && (
                <div className="mt-1.5 flex gap-1" aria-hidden="true">
                    {Array.from({ length: people }, (_, i) => (
                        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < splitPaid ? 'bg-rb-green' : i === splitPaid ? 'bg-rb-accent' : 'bg-rb-neutral-bg'}`} />
                    ))}
                </div>
            )}
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {split === 'people' && peopleLeft > 1 && toKurus(lastShare) !== toKurus(personShare) && `Kuruş farkı son kişide (${formatPrice(lastShare)} ₺). `}
                {split === 'items' && payKind === 'items' && itemsDiscount > 0 && `Ürün indirimi −${formatPrice(itemsDiscount)} ₺ dahil. `}
                {restAfter > 0 ? `Bu ödemeden sonra kalan ${formatPrice(restAfter)} ₺.` : 'Bu ödemeyle hesap kapanır.'}
            </p>
        </div>
    );

    // ---- Kasa satırı: fiziksel kasa/vardiya, ödeme yönteminden bağımsız. Seçim yalnızca yönetici ekranında (manual).
    const registerLine = cashRegisterMode === 'shift' ? (
        // Kasiyer kasa seçmez: vardiyasını yöneticinin atadığı kasada açar, ödeme o kasaya yazılır.
        activeShift ? (
            <p className="flex items-center gap-2 text-sm">
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-muted-foreground">Kasa:</span>
                <span className="min-w-0 truncate font-semibold text-foreground">{activeShift.cashRegisterName}</span>
                <span className="shrink-0 text-muted-foreground">· vardiyanız</span>
            </p>
        ) : (
            <p className="text-sm font-medium text-destructive">Açık bir vardiyanız yok, ödeme alınamaz.</p>
        )
    ) : loadingCashRegisters ? (
        <p className="text-sm text-muted-foreground">Kasalar yükleniyor...</p>
    ) : cashRegisters.length === 0 ? (
        <p className="text-sm font-medium text-destructive">Açık kasa bulunamadı.</p>
    ) : (cashRegisters.length > 1 || willOpenShift) ? (
        <div className="space-y-1">
            {/* Tek kasa varsa seçim gizlenir, o kasa kendiliğinden kullanılır. */}
            {cashRegisters.length > 1 && (
                <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <label htmlFor="payment-register" className="text-sm text-muted-foreground">Kasa:</label>
                    <div className="relative min-w-0 flex-1">
                        <select
                            id="payment-register"
                            value={selectedCashRegisterId}
                            onChange={e => void handleSelectRegister(e.target.value)}
                            disabled={ensuringShift || submitting}
                            aria-describedby={willOpenShift ? 'register-shift-note' : undefined}
                            className="h-11 w-full appearance-none truncate rounded-lg border border-border bg-card pr-8 pl-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                        >
                            {cashRegisters.map(register => (
                                <option key={register.cashRegisterId} value={register.cashRegisterId}>
                                    {register.cashRegisterName}{register.hasOpenShift
                                        ? ` · ${register.openShiftOwnerName || 'açık'} vardiyası`
                                        // Bu ekranda (ödemeyle) açılan vardiya aday listesinde hâlâ "vardiya yok" görünür.
                                        : activeShift?.cashRegisterId === register.cashRegisterId
                                            ? ` · ${activeShift.openedByUserName || 'sizin'} vardiyası`
                                            : ' · vardiya yok'}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    </div>
                </div>
            )}
            {willOpenShift && (
                <p id="register-shift-note" className="text-sm font-medium text-rb-amber">
                    {cashRegisters.length > 1 ? 'Bu kasada' : `${selectedRegister?.cashRegisterName} kasasında`} açık vardiya yok; ödeme alınınca sizin adınıza açılacak.
                </p>
            )}
        </div>
    ) : null;

    const sectionTitle = 'flex items-center gap-2.5 text-lg font-semibold text-foreground';

    return (
        <div className="flex h-full flex-col">
            {/* Başlık: masa · hesap, garson ve açılış, durum, kapat */}
            <header className="shrink-0 border-b border-border px-4 pt-5 pb-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="min-w-0">
                            <h2 className="font-serif text-2xl font-bold text-foreground">
                                {displayOrder.tableName ? `${displayOrder.tableName} · Hesap` : 'Hesap'}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {[displayOrder.createdByUserName, `Açılış: ${formatElapsed(displayOrder.createdAt)} önce`].filter(Boolean).join(' • ')}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rb-amber-bg px-3 py-1 text-xs font-semibold text-rb-amber">
                                <span className="h-1.5 w-1.5 rounded-full bg-rb-amber" aria-hidden="true" />
                                {paidTotal > 0 ? 'Kısmen ödendi' : 'Açık Hesap'}
                            </span>
                            {displayOrder.billRequestedAt && (
                                <span className="inline-flex items-center rounded-full bg-rb-accent-bg px-3 py-1 text-xs font-semibold text-rb-accent">Hesap istendi</span>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/*
              Geniş ekranda iki sütun (sol: hesap özeti, sağ: ödeme + altta düğme). Dar ekranda tek kaydırma alanı:
              önce özet, sonra ödeme; düğme kaydırma alanının dışında, altta sabit. lg:contents ile aynı öğeler
              geniş ekranda ızgaranın hücrelerine yerleşir.
            */}
            <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto]">
                <div className="min-h-0 flex-1 overflow-y-auto lg:contents">
                    {/* Sol: kalemler, toplamlar, indirim / böl */}
                    <section aria-label="Hesap özeti" className="space-y-4 px-4 py-5 sm:px-6 lg:row-span-2 lg:overflow-y-auto lg:border-r lg:border-border">
                        <div className="rounded-2xl border border-border bg-card">
                            <h3 className={`${sectionTitle} border-b border-border px-4 py-3.5`}>
                                <ReceiptText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                Sipariş Kalemleri ({lines.length})
                            </h3>
                            {lines.length === 0 ? (
                                <p className="px-4 py-6 text-sm text-muted-foreground">Hesapta ürün yok.</p>
                            ) : (
                                <ul className="divide-y divide-border px-4">
                                    {lines.map(line => {
                                        const selectedQty = split === 'items' ? selectedQuantities[line.key] ?? 0 : 0;
                                        return (
                                            <li key={line.key} className="flex items-center gap-3 py-3">
                                                <LineThumb name={line.productName} src={productImages[line.items[0]?.productId ?? '']} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[15px] font-semibold text-foreground">
                                                        {line.productName}{line.isTakeaway && <TakeawayBadge className="ml-1.5" />}
                                                    </p>
                                                    <p className="text-sm tabular-nums text-muted-foreground">{line.quantity} adet × {formatPrice(line.unitPrice)} ₺</p>
                                                    {line.components && line.components.length > 0 && (
                                                        <p className="text-xs text-muted-foreground">{line.components.map(c => c.productName).join(' · ')}</p>
                                                    )}
                                                    {line.note && <p className="mt-0.5 text-xs text-rb-amber">Not: {line.note}</p>}
                                                    {lineDiscountNote(line)}
                                                    {selectedQty > 0 && (
                                                        <span className="mt-1 inline-flex rounded-full bg-rb-accent-bg px-2 py-0.5 text-xs font-semibold tabular-nums text-rb-accent">
                                                            Bu ödemede {selectedQty}/{line.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-foreground">
                                                    {formatPrice(line.unitPrice * line.quantity)} ₺
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {/* Toplamlar: ara toplam − indirimler − tutarla alınan = ödenecek */}
                            <div className="space-y-2 border-t border-border px-4 pt-3 pb-4 text-[15px]">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Ara Toplam</span>
                                    <span className="font-semibold tabular-nums text-foreground">{formatPrice(displayOrder.totalPrice)} ₺</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">İndirim / İkram</span>
                                    <span className={`font-semibold tabular-nums ${closingDiscount > 0 ? 'text-rb-red' : 'text-foreground'}`}>
                                        {closingDiscount > 0 ? `−${formatPrice(closingDiscount)}` : '0'} ₺
                                    </span>
                                </div>
                                {hasStagedDiscount && (
                                    <StagedDiscountList
                                        lines={lines}
                                        staged={staged}
                                        lineDiscounts={lineDiscounts}
                                        bill={bill}
                                        billDiscount={billDiscount}
                                        onRemoveLine={pay.removeLineDiscount}
                                        onRemoveBill={pay.removeBillDiscount}
                                    />
                                )}
                                {closingPlan.itemDiscount > closingItemDiscount && (
                                    <p className="text-xs text-muted-foreground">Ürün indirimi kalan tutarı ({formatPrice(due)} ₺) aşamaz; o kadarı düşülür.</p>
                                )}
                                {paidOnAccount > 0 && (
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground">Ödenen</span>
                                        <span className="font-semibold tabular-nums text-rb-green">−{formatPrice(paidOnAccount)} ₺</span>
                                    </div>
                                )}
                                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-rb-accent-bg px-4 py-3">
                                    <span className="font-serif text-lg font-bold text-foreground">Ödenecek Tutar</span>
                                    <span className="font-serif text-2xl font-bold tabular-nums text-foreground">{formatPrice(remainingNet)} ₺</span>
                                </div>
                                {hasStagedDiscount && split !== 'full' && (
                                    <p className="text-xs text-muted-foreground">
                                        {split === 'items'
                                            ? 'Ürün indirimi o ürün ödenirken, hesap indirimi hesabı kapatan ödemede uygulanır.'
                                            : 'İndirimler hesabı kapatan (son) ödemede uygulanır; kalan şimdiden indirimli gösterilir.'}
                                    </p>
                                )}
                                {taxGroups.length > 1 ? (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setShowTaxBreakdown(v => !v)}
                                            aria-expanded={showTaxBreakdown}
                                            className="flex min-h-9 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            KDV Dahil — Detay
                                            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTaxBreakdown ? 'rotate-180' : ''}`} />
                                        </button>
                                        {showTaxBreakdown && (
                                            <div className="mt-1 divide-y divide-border overflow-hidden rounded-lg border border-border">
                                                {taxGroups.map(group => {
                                                    const matrah = group.total / (1 + group.rate / 100);
                                                    const kdvTutari = group.total - matrah;
                                                    return (
                                                        <div key={group.rate} className="space-y-1 px-3 py-2.5">
                                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                {Array.from(group.categories).join(', ') || 'Diğer'} · KDV %{group.rate}
                                                            </p>
                                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                <span>Matrah</span>
                                                                <span className="tabular-nums">{formatAmount(matrah)} ₺</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                <span>KDV Tutarı</span>
                                                                <span className="tabular-nums">{formatAmount(kdvTutari)} ₺</span>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-0.5 text-xs font-medium text-foreground">
                                                                <span>Ara Toplam</span>
                                                                <span className="tabular-nums">{formatAmount(group.total)} ₺</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">KDV Dahil</p>
                                )}
                            </div>
                        </div>

                        <div className={`grid gap-3 ${canDiscount ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {canDiscount && (
                                <button type="button" onClick={() => setDiscountOpen(true)} disabled={lines.length === 0} className={secondaryButton}>
                                    <Tag className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                    İndirim / İkram Ekle
                                </button>
                            )}
                            <button type="button" onClick={openSplitDialog} disabled={lines.length === 0 || remainingNet <= 0} className={secondaryButton}>
                                <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                                Hesabı Böl
                            </button>
                        </div>
                        <p className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            İndirim, ikram ve hesap bölme işlemleri ödemeden önce yapılır.
                        </p>

                        {(log.length > 0 || unloggedOnAccount > 0) && (
                            <div>
                                <p className="mb-2 flex items-center justify-between text-sm">
                                    <span className="font-semibold text-foreground">Alınan ödemeler</span>
                                    <span className="font-semibold tabular-nums text-rb-green">Toplam {formatPrice(paidTotal)} ₺</span>
                                </p>
                                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                                    {unloggedOnAccount > 0 && (
                                        <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                                            <span className="text-muted-foreground">Önceden alınan (başka ekrandan)</span>
                                            <span className="font-semibold tabular-nums text-foreground">{formatPrice(unloggedOnAccount)} ₺</span>
                                        </li>
                                    )}
                                    {log.map((p, i) => (
                                        <li key={`${p.at}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                                            <span className="min-w-0 text-muted-foreground">
                                                <span className="font-medium text-foreground">{p.method}</span>
                                                {' · '}{clockTime(p.at)}{p.registerName ? ` · ${p.registerName}` : ''}
                                            </span>
                                            <span className="font-semibold tabular-nums text-rb-green">{formatPrice(p.amount)} ₺</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>

                    {/* Sağ: tahsil edilecek tutar, bölme özeti, yöntem, yöntemin paneli */}
                    <section aria-labelledby="pay-title" className="space-y-4 border-t border-border px-4 py-5 sm:px-6 lg:col-start-2 lg:row-start-1 lg:overflow-y-auto lg:border-t-0">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <Wallet className="mt-1 h-7 w-7 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <div>
                                    <h3 id="pay-title" className="font-serif text-2xl font-bold text-foreground">Ödeme</h3>
                                    <p className="text-sm text-muted-foreground">Tahsil edilecek tutar</p>
                                </div>
                            </div>
                            <p className="font-serif text-4xl font-bold tabular-nums text-foreground sm:text-5xl" aria-live="polite" aria-atomic="true">
                                <span className="sr-only">Tahsil edilecek: </span>{formatPrice(net)} ₺
                            </p>
                        </div>

                        {splitSummary ?? (paidTotal > 0 && (
                            <p className="text-sm tabular-nums text-muted-foreground">
                                Hesabın kalanı · <span className="font-semibold text-rb-green">ödenen {formatPrice(paidTotal)} ₺</span>
                            </p>
                        ))}

                        {methodNeeded ? (
                            <>
                                <div className="space-y-2">
                                    <p id="pay-method" className="sr-only">Ödeme yöntemi</p>
                                    <MethodCards
                                        value={paymentMethod}
                                        onChange={setPaymentMethod}
                                        labelledBy="pay-method"
                                        disabled={hasIban ? {} : { iban: 'IBAN tanımlı değil' }}
                                    />
                                    {!hasIban && ibanSettings !== null && (
                                        <p className="text-xs text-muted-foreground">
                                            IBAN ile ödeme kapalı: şubede IBAN tanımlı değil. {isAdmin ? 'Ayarlar → Ödeme sekmesinden ekleyebilirsin.' : 'Yöneticiniz Ayarlar → Ödeme sekmesinden ekleyebilir.'}
                                        </p>
                                    )}
                                </div>

                                {paymentMethod === 'nakit' && (
                                    <CashPanel net={net} receivedInput={receivedInput} onReceivedChange={setReceivedInput} change={change} cashShort={cashShort} />
                                )}
                                {paymentMethod === 'kart' && <CardPanel net={net} />}
                                {paymentMethod === 'qr' && <QrPanel net={net} />}
                                {paymentMethod === 'iban' && hasIban && ibanSettings && (
                                    <IbanPanel net={net} settings={ibanSettings} reference={transferDescription} />
                                )}
                                {!paymentMethod && (
                                    <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                        Ödeme yöntemini seçin.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="flex items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-foreground">
                                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                Ödenecek tutar 0 ₺: ödeme yöntemi gerekmez, ikram olarak kaydedilir ve hesap kapanır.
                            </p>
                        )}
                    </section>
                </div>

                {/* Kasa + Ödemeyi Tamamla: dar ekranda kaydırma alanının dışında, hep görünür. */}
                <div className="shrink-0 space-y-2.5 border-t border-border bg-[#FFFDF8] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:col-start-2 lg:row-start-2 dark:bg-[#1C1712]">
                    {registerLine}
                    <button
                        type="button"
                        onClick={() => void handleComplete()}
                        disabled={!canComplete}
                        aria-busy={submitting}
                        className={`flex min-h-15 w-full items-center justify-center gap-3 rounded-xl px-4 py-2 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            canComplete ? 'cursor-pointer bg-rb-accent text-rb-accent-foreground hover:opacity-90' : 'cursor-not-allowed bg-rb-neutral-bg text-muted-foreground'
                        }`}
                    >
                        {canComplete && <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />}
                        <span className="flex flex-col items-start text-left leading-tight">
                            <span className="text-base font-semibold sm:text-lg">{buttonTitle}</span>
                            {buttonDetail && <span className="text-sm font-medium tabular-nums opacity-90">{buttonDetail}</span>}
                        </span>
                    </button>
                </div>
            </div>

            {discountOpen && canDiscount && (
                <PaymentDialog title="İndirim / İkram Ekle" description="Hesaba ya da bir ürüne; ödeme alınırken uygulanır." onClose={() => setDiscountOpen(false)}>
                    <PaymentDiscountEditor
                        lines={lines}
                        billBase={afterItems}
                        maxDiscountPercent={maxDiscountPercent}
                        onApplyBill={d => { pay.applyBillDiscount(d); setDiscountOpen(false); }}
                        onApplyLine={(key, d) => { pay.applyLineDiscount(key, d); setDiscountOpen(false); }}
                        onCancel={() => setDiscountOpen(false)}
                    />
                </PaymentDialog>
            )}
            {splitDialog && (
                <PaymentSplitDialog
                    initialTab={splitDialog}
                    lines={lines}
                    lineDiscounts={lineDiscounts}
                    maxDiscountPercent={maxDiscountPercent}
                    remainingNet={remainingNet}
                    itemsLocked={itemsLocked}
                    people={people}
                    splitPaid={splitPaid}
                    selectedQuantities={selectedQuantities}
                    customAmount={customAmount}
                    onApplyPeople={applyPeople}
                    onApplyItems={applyItems}
                    onApplyAmount={applyAmount}
                    onClose={() => setSplitDialog(null)}
                />
            )}
        </div>
    );
}
