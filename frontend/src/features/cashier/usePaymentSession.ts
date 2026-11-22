import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { paymentService, type PaymentDiscount } from '@/features/cashier/api/paymentService';
import { buildPayItems, groupBillLines, round2, type LineDiscount } from '@/features/cashier/billLines';
import {
    changeDue, MAX_PEOPLE, METHOD_LABEL, parseMoney, readPaymentLog, readSplit, readStaged, splitShare, toKurus,
    writePaymentLog, writeSplit, writeStaged, type PaymentLogEntry, type PaymentMethod, type SplitProgress,
    type StagedBillDiscount, type StagedDiscounts, type StagedLineDiscount,
} from '@/features/cashier/paymentMath';
import { orderService } from '@/features/orders/api/orderService';
import type { Order } from '@/features/orders/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';

/**
 * Bu ödemede ne kadar alınır? full: kalanın tamamı · people: eşit bölmede sıradaki kişinin payı ·
 * items: seçilen kalemler · amount: elle yazılan kısmi tutar. Seçim "Hesabı Böl"den yapılır.
 */
export type PaymentSplit = 'full' | 'people' | 'items' | 'amount';

export const PAYMENT_METHOD_VALUES: Record<PaymentMethod, number> = { kart: 1, nakit: 2, qr: 3, iban: 4 };
// Hesap isteğindeki ödeme tercihi (BillPaymentHint: 1 Nakit, 2 Kart, 3 IBAN) → ödeme yöntemi.
const HINT_TO_METHOD: Record<number, PaymentMethod | undefined> = { 1: 'nakit', 2: 'kart', 3: 'iban' };
const EMPTY_STAGED: StagedDiscounts = { lines: {} };

/** Bekleyen ürün indirimi → hesap satırı indirimi (ikram = %100). */
const toLineDiscount = (d: StagedLineDiscount): LineDiscount =>
    ({ type: d.kind === 'amount' ? 'amount' : 'percent', value: d.kind === 'ikram' ? 100 : d.value, quantity: d.quantity });

export const describeBillDiscount = (d: StagedBillDiscount) =>
    d.kind === 'ikram' ? 'Hesap ikramı' : d.kind === 'percent' ? `Hesap indirimi %${formatPrice(d.value)}` : 'Hesap indirimi';

interface Options {
    order: Order;
    /** İndirim/ikram yetkisi ve sınırı (100 = sınırsız). */
    canDiscount: boolean;
    maxDiscountPercent: number;
    /** Hesap isteği ipuçları; verilmezse siparişteki müşteri tercihi (billSplitCount / billPaymentHint) kullanılır. */
    initialPeople?: number;
    initialMethod?: PaymentMethod;
    /** İpucu yokken ve her kısmi ödemeden sonra seçili gelen yöntem (kasiyer ekranında yok: bilinçli seçilir). */
    defaultMethod?: PaymentMethod | null;
}

export interface PayCallbacks {
    /** Ödemenin yazılacağı kasa; null dönerse ödeme gönderilmez (neden çağıran tarafından bildirilir). */
    resolveRegister: () => Promise<string | null>;
    /** Ödeme listesine yazılan kasa adı. */
    registerName?: string;
    onSuccess?: (registerId: string) => void;
    onFullyPaid: () => void;
    onPartiallyPaid?: () => void;
    onError?: () => void;
}

/**
 * Ödeme ekranının ortak durumu ve hesabı: kasiyer/yönetici paneli (PaymentPanel) ve garson ekranı (PaymentView)
 * aynı kuralları kullanır. Eşit bölme ilerlemesi, bekleyen indirimler ve alınan ödemeler sipariş başına oturumda
 * tutulur: ekran kapanıp açılsa da sürer. Kasa seçimi ve görünüm çağırana aittir.
 */
export function usePaymentSession({
    order, canDiscount, maxDiscountPercent, initialPeople: initialPeopleProp, initialMethod: initialMethodProp, defaultMethod = null,
}: Options) {
    const initialPeople = initialPeopleProp ?? order.billSplitCount ?? undefined;
    const initialMethod = initialMethodProp ?? HINT_TO_METHOD[order.billPaymentHint ?? 0] ?? defaultMethod ?? undefined;
    const [displayOrder, setDisplayOrder] = useState<Order>(order);

    const [splitProgress, setSplitProgress] = useState<SplitProgress | null>(() => readSplit(order.id));
    const [split, setSplit] = useState<PaymentSplit>(() => (splitProgress || (initialPeople ?? 0) > 1 ? 'people' : 'full'));
    const [people, setPeople] = useState(() => splitProgress?.people ?? Math.max(2, Math.min(initialPeople ?? 2, MAX_PEOPLE)));
    const splitPaid = splitProgress?.paid ?? 0;
    const [staged, setStaged] = useState<StagedDiscounts>(() => readStaged<StagedDiscounts>(order.id) ?? EMPTY_STAGED);
    const [log, setLog] = useState<PaymentLogEntry[]>(() => readPaymentLog(order.id));

    // Belirli tutar: bu ödemede alınacak kısmi tutar (ürünler masada kalır).
    const [customAmount, setCustomAmount] = useState<number | null>(null);
    // Ürünlere göre: satır anahtarına göre bu ödemede ödenecek adet.
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(initialMethod ?? null);
    const [receivedInput, setReceivedInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    // Çift dokunuşa karşı eşzamanlı kilit: state güncellenmeden gelen ikinci tıklama da durur. Sunucu da aynı
    // sipariş için uçuştaki ikinci ödemeyi reddeder (create-payment:{OrderId} idempotency kilidi).
    const submitLock = useRef(false);

    // Ebeveyn aynı siparişin güncel halini verirse görünüm güncellenir; ürün/tutar seçimi sıfırlanır (kalemler
    // değişmiş olabilir), indirim ve eşit bölme kalır.
    const [prevOrder, setPrevOrder] = useState(order);
    if (order !== prevOrder) {
        setPrevOrder(order);
        setDisplayOrder(order);
        setSelectedQuantities({});
        setCustomAmount(null);
        if (split === 'items' || split === 'amount') setSplit('full');
        if (order.id !== prevOrder.id) {
            const progress = readSplit(order.id);
            setSplitProgress(progress);
            setPeople(progress?.people ?? 2);
            setSplit(progress ? 'people' : 'full');
            setStaged(readStaged<StagedDiscounts>(order.id) ?? EMPTY_STAGED);
            setLog(readPaymentLog(order.id));
            setPaymentMethod(defaultMethod);
            setReceivedInput('');
        }
    }

    useEffect(() => {
        writeStaged(displayOrder.id, staged.bill || Object.keys(staged.lines).length > 0 ? staged : null);
    }, [displayOrder.id, staged]);

    // Aynı ürünün ayrı turlarda gelen kalemleri tek satırda; ödeme sunucuya kalem kalem dağıtılarak gider.
    const lines = useMemo(() => groupBillLines(displayOrder.orderItems), [displayOrder.orderItems]);
    const paidOnAccount = displayOrder.paidAmount ?? 0;
    const due = displayOrder.remainingAmount ?? displayOrder.totalPrice;
    // Tutar girerek alınmış ödeme varsa sunucu ürün seçerek ödemeyi kabul etmez (yalnızca kalanın tamamı).
    const itemsLocked = paidOnAccount > 0;

    // ---- İndirimler: bekleyenler hesabı kapatan ödemede (ürünle ödemede o ürünlerle) gönderilir. Ürün indirimi
    // önce, hesap indirimi kalan tutara; sınır sunucuyla aynı şekilde denetlenir.
    const lineDiscounts: Record<string, LineDiscount> = {};
    if (canDiscount) {
        for (const line of lines) {
            const d = staged.lines[line.key];
            if (d) lineDiscounts[line.key] = toLineDiscount(d);
        }
    }
    const bill = canDiscount ? staged.bill : undefined;
    const closingPlan = buildPayItems(lines, line => line.quantity, lineDiscounts, maxDiscountPercent);
    const closingItemDiscount = Math.min(closingPlan.itemDiscount, due);
    const afterItems = round2(due - closingItemDiscount);
    const billDiscount = !bill ? 0 : round2(Math.min(
        bill.frozenAmount ?? (bill.kind === 'amount' ? bill.value : afterItems * (bill.kind === 'ikram' ? 100 : bill.value) / 100),
        afterItems,
    ));
    const closingDiscount = round2(closingItemDiscount + billDiscount);
    /** Hesabı kapatmak için alınacak tutar (bekleyen indirimler düşülmüş). */
    const remainingNet = Math.max(round2(due - closingDiscount), 0);
    // Sunucunun sınır denetimi: tutarla giden hesap indirimi kapanıştaki kalana oranlanır; ürün indirimi de varsa
    // toplam indirim kalanın sınırını aşamaz.
    const billSentAsPercent = !!bill && bill.kind !== 'amount' && bill.frozenAmount === undefined;
    const billPercentSent = !bill ? 0 : billSentAsPercent
        ? (bill.kind === 'ikram' ? 100 : bill.value)
        : afterItems > 0 ? billDiscount * 100 / afterItems : 0;
    const closingOverLimit = canDiscount && (
        billPercentSent > maxDiscountPercent
        || closingPlan.lineOverLimit
        || (closingItemDiscount > 0 && closingDiscount > round2(due * maxDiscountPercent / 100))
    );
    const hasStagedDiscount = !!bill || Object.keys(lineDiscounts).length > 0;

    // ---- Bu ödeme: ne kadar ve hangi türde? close: kalanın tamamı (tüm kalemler + indirimler) · amount: ürün seçmeden
    // tutar (indirim gitmez, kapanışta gider) · items: seçilen kalemler.
    const peopleLeft = Math.max(people - splitPaid, 1);
    const personShare = splitShare(remainingNet, peopleLeft);
    const lastShare = round2(remainingNet - personShare * (peopleLeft - 1));
    const selectedTotal = round2(lines.reduce((sum, line) => sum + (selectedQuantities[line.key] ?? 0) * line.unitPrice, 0));
    const selectedCount = lines.reduce((sum, line) => sum + (selectedQuantities[line.key] ?? 0), 0);
    const coversAll = lines.length > 0 && lines.every(line => (selectedQuantities[line.key] ?? 0) === line.quantity);
    const itemsPlan = buildPayItems(lines, line => selectedQuantities[line.key] ?? 0, lineDiscounts, maxDiscountPercent);
    const itemsDiscount = Math.min(itemsPlan.itemDiscount, selectedTotal);

    let payKind: 'close' | 'amount' | 'items' = 'close';
    let net = remainingNet;
    if (split === 'items') {
        if (!coversAll) {
            payKind = 'items';
            net = Math.max(round2(selectedTotal - itemsDiscount), 0);
        }
    } else if (toKurus(remainingNet) > 0) {
        if (split === 'amount' && customAmount !== null && toKurus(customAmount) < toKurus(remainingNet)) {
            payKind = 'amount';
            net = customAmount;
        } else if (split === 'people' && peopleLeft > 1) {
            payKind = 'amount';
            net = personShare;
        }
    }
    const restAfter = Math.max(round2(remainingNet - net), 0);
    // Tutar seçildikten sonra indirim eklenip kalan küçülebilir.
    const amountTooHigh = split === 'amount' && customAmount !== null && toKurus(customAmount) > toKurus(remainingNet);
    const itemsOverLimit = canDiscount && payKind === 'items'
        && (itemsPlan.lineOverLimit || itemsDiscount > round2(selectedTotal * maxDiscountPercent / 100));
    const overLimit = payKind === 'close' ? closingOverLimit : payKind === 'items' ? itemsOverLimit : false;

    // ---- Nakit: alınan para boşsa tam tutar alınmış sayılır.
    const received = parseMoney(receivedInput);
    const change = paymentMethod === 'nakit' && receivedInput ? changeDue(received, net) : null;
    const cashShort = paymentMethod === 'nakit' && !!receivedInput && change === null;

    // ---- Ödemeler: bu cihazda alınanlar + sunucuda olup listede olmayan (başka ekrandan alınmış) hesaba ödemeler.
    const loggedOnAccount = round2(log.filter(p => p.onAccount).reduce((s, p) => s + p.amount, 0));
    const unloggedOnAccount = Math.max(round2(paidOnAccount - loggedOnAccount), 0);
    const paidTotal = round2(log.reduce((s, p) => s + p.amount, 0) + unloggedOnAccount);

    // Tamamı ikram/indirimle 0'a inen ödemede yöntem sorulmaz (kasaya para girmez).
    const isFree = net === 0 && (payKind === 'close' || (payKind === 'items' && selectedTotal > 0));
    const methodNeeded = !isFree;

    /** Kasa dışındaki eksik seçim (kasa denetimi çağırana ait, ondan sonra bakılır). */
    const missing = (hasIban: boolean): string | null =>
        lines.length === 0 ? 'Hesapta ürün yok'
        : split === 'items' && selectedTotal <= 0 ? 'Hesabı Böl\'den ürün seçin'
        : amountTooHigh ? 'Tutar kalandan fazla'
        : payKind === 'amount' && net <= 0 ? 'Tutar çok küçük'
        : overLimit ? `İndirim sınırı aşılıyor (en fazla %${maxDiscountPercent})`
        : methodNeeded && !paymentMethod ? 'Ödeme yöntemi seçin'
        : methodNeeded && paymentMethod === 'iban' && !hasIban ? 'IBAN tanımlı değil'
        : cashShort ? 'Alınan para yetersiz'
        : null;

    const saveSplit = (progress: SplitProgress | null) => {
        setSplitProgress(progress);
        writeSplit(displayOrder.id, progress);
    };

    // ---- Hesabı Böl'den gelen seçimler.
    const applyPeople = (count: number) => {
        const value = Math.min(Math.max(count, 2, splitPaid + 1), MAX_PEOPLE);
        setPeople(value);
        saveSplit({ people: value, paid: splitPaid });
        setSplit('people');
        setSelectedQuantities({});
        setCustomAmount(null);
        setReceivedInput('');
    };
    const applyItems = (selection: Record<string, number>) => {
        setSelectedQuantities(selection);
        setSplit('items');
        setCustomAmount(null);
        setReceivedInput('');
    };
    const applyAmount = (amount: number) => {
        setCustomAmount(amount);
        setSplit('amount');
        setSelectedQuantities({});
        setReceivedInput('');
    };
    /** Bölmeyi iptal: kalanın tamamı alınır. Eşit bölmede ödeyenler hesaptan düşülmüştür, kalan doğrudur. */
    const cancelSplit = () => {
        if (split === 'people') {
            saveSplit(null);
            setPeople(Math.max(2, Math.min(initialPeople ?? 2, MAX_PEOPLE)));
        }
        setSplit('full');
        setSelectedQuantities({});
        setCustomAmount(null);
        setReceivedInput('');
    };

    const applyBillDiscount = (discount: StagedBillDiscount) => setStaged(prev => ({ ...prev, bill: discount }));
    const applyLineDiscount = (key: string, discount: StagedLineDiscount) =>
        setStaged(prev => ({ ...prev, lines: { ...prev.lines, [key]: discount } }));
    const removeBillDiscount = () => setStaged(prev => ({ ...prev, bill: undefined }));
    const removeLineDiscount = (key: string) => setStaged(prev => {
        const next = { ...prev.lines };
        delete next[key];
        return { ...prev, lines: next };
    });

    /** Gönderilen ödemedeki indirim notları (sunucu ödeme başına tek not tutar). */
    const discountNote = (keys: string[], withBill: boolean) => {
        const notes = [...keys.map(k => staged.lines[k]?.note), withBill ? bill?.note : undefined].filter((n): n is string => !!n);
        return [...new Set(notes)].join(' · ').slice(0, 300) || undefined;
    };

    /** Ödemeyi gönderir. canComplete çağıranın (kasa dahil) denetimidir; çift gönderim kilitlidir. */
    const pay = async (canComplete: boolean, callbacks: PayCallbacks) => {
        if (!canComplete || submitLock.current) return;
        submitLock.current = true;
        setSubmitting(true);
        try {
            const paymentRegisterId = await callbacks.resolveRegister();
            if (!paymentRegisterId) return;

            // Kapanış: tüm kalemler + bekleyen tüm indirimler. Ürünle: seçilen kalemler + onların ürün indirimi.
            // Tutar: kalem ve indirim gönderilmez (sunucu tutar ödemesinde indirimi reddeder; indirim kapanışta gider).
            const items = payKind === 'close' ? closingPlan.items : payKind === 'items' ? itemsPlan.items : [];
            const usedLineKeys = payKind === 'close'
                ? Object.keys(lineDiscounts)
                : payKind === 'items' ? Object.keys(lineDiscounts).filter(k => (selectedQuantities[k] ?? 0) > 0) : [];
            let discount: PaymentDiscount | undefined;
            if (payKind === 'close' && bill && billDiscount > 0) {
                // Hiç tutar ödemesi alınmamışken yüzde olarak gider (sunucu aynı tutarı bulur); sabitlenmişse tutar olarak.
                discount = billSentAsPercent ? { percent: bill.kind === 'ikram' ? 100 : bill.value } : { amount: billDiscount };
            }
            const note = discountNote(usedLineKeys, !!discount);
            if (note) discount = { ...discount, note };
            const method: PaymentMethod = net === 0 || !paymentMethod ? 'nakit' : paymentMethod;

            const fullyPaid: boolean = await paymentService.createPayment(
                displayOrder.id, paymentRegisterId, PAYMENT_METHOD_VALUES[method], items, discount,
                payKind === 'amount' ? net : undefined,
            );

            callbacks.onSuccess?.(paymentRegisterId);
            const changeNote = method === 'nakit' && change && change > 0 ? ` · para üstü ${formatPrice(change)} ₺` : '';
            if (fullyPaid) {
                writeSplit(displayOrder.id, null);
                writePaymentLog(displayOrder.id, null);
                writeStaged(displayOrder.id, null);
                toast.success(net === 0 ? 'İkram kaydedildi, hesap kapandı.' : `${formatPrice(net)} ₺ alındı${changeNote}. Hesap kapandı.`);
                callbacks.onFullyPaid();
                return;
            }

            const nextLog: PaymentLogEntry[] = [...log, {
                amount: net,
                method: net === 0 ? 'İkram' : METHOD_LABEL[method],
                at: new Date().toISOString(),
                registerName: callbacks.registerName,
                onAccount: payKind === 'amount',
            }];
            setLog(nextLog);
            writePaymentLog(displayOrder.id, nextLog);
            // Eşit bölmede sıradaki kişiye geçilir; ürün ve tutar seçimi tek ödemeliktir, ekran kalanın tamamına döner.
            if (split === 'people' && payKind === 'amount') saveSplit({ people, paid: splitPaid + 1 });
            else if (split === 'items' || split === 'amount') setSplit('full');
            const frozenBill = payKind === 'amount' && billSentAsPercent ? billDiscount : undefined;
            setStaged(prev => {
                let next = prev;
                // Tutar ödemesi alınınca yüzdeli hesap indirimi o anki tutara sabitlenir (bkz. StagedBillDiscount).
                if (frozenBill !== undefined && prev.bill) next = { ...next, bill: { ...prev.bill, frozenAmount: frozenBill } };
                // Ürünle ödemede gönderilen ürün indirimleri kullanıldı.
                if (payKind === 'items' && usedLineKeys.length > 0) {
                    const linesLeft = { ...next.lines };
                    for (const key of usedLineKeys) delete linesLeft[key];
                    next = { ...next, lines: linesLeft };
                }
                return next;
            });
            setSelectedQuantities({});
            setCustomAmount(null);
            setReceivedInput('');
            // Sonraki kişi farklı yöntemle ödeyebilir: yöntem her ödemede yeniden seçilir (garson ekranında Nakit gelir).
            setPaymentMethod(defaultMethod);
            toast.success(`${formatPrice(net)} ₺ alındı${changeNote} · kalan ${formatPrice(restAfter)} ₺, masa açık.`);
            // Paket siparişin masası yok; tahsilatı bu ekrandan alınmaz (kurye teslim akışı).
            const refreshed = displayOrder.tableId ? await orderService.getOrderByTableId(displayOrder.tableId) : null;
            if (refreshed) setDisplayOrder(refreshed);
            callbacks.onPartiallyPaid?.();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Ödeme tamamlanamadı.'));
            callbacks.onError?.();
        } finally {
            submitLock.current = false;
            setSubmitting(false);
        }
    };

    return {
        displayOrder, lines, paidOnAccount, due, itemsLocked,
        staged, lineDiscounts, bill, closingPlan, closingItemDiscount, afterItems, billDiscount, closingDiscount, remainingNet,
        hasStagedDiscount,
        split, people, splitPaid, peopleLeft, personShare, lastShare,
        selectedQuantities, selectedTotal, selectedCount, coversAll, itemsDiscount, customAmount,
        payKind, net, restAfter, overLimit,
        paymentMethod, setPaymentMethod, receivedInput, setReceivedInput, change, cashShort,
        log, unloggedOnAccount, paidTotal,
        isFree, methodNeeded, missing, submitting,
        applyPeople, applyItems, applyAmount, cancelSplit,
        applyBillDiscount, applyLineDiscount, removeBillDiscount, removeLineDiscount,
        pay,
    };
}

export type PaymentSession = ReturnType<typeof usePaymentSession>;
