import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, Gift, Lock, Tag, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService } from '@/features/cashier/api/shiftService';
import { paymentSettingsService, type BranchPaymentSettings } from '@/features/branches/api/paymentSettingsService';
import { METHOD_LABEL, toKurus, type PaymentMethod } from '@/features/cashier/paymentMath';
import { usePaymentSession } from '@/features/cashier/usePaymentSession';
import type { OpenRegister } from '@/features/cashier/types';
import type { Order } from '@/features/orders/types';
import type { Table } from '@/features/tables/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import PaymentDiscountEditor, { StagedDiscountList } from '@/pages/cashier/components/PaymentDiscountEditor';
import PaymentSplitDialog, { type SplitTab } from '@/pages/cashier/components/PaymentSplitDialog';
import { CardPanel, CashPanel, IbanPanel, MethodCards } from '@/pages/cashier/components/PaymentMethodPanels';
import PaymentSheet from './PaymentSheet';
import { readStoredRegister } from '../waiterUi';

/** Garsonun aldığı yöntemler (QR garson ekranında hiç olmadı). */
const WAITER_METHODS: PaymentMethod[] = ['nakit', 'kart', 'iban'];
/** Garsonda indirim sınırı yok: sunucu sınırı yalnızca kasiyere uygular. */
const WAITER_MAX_DISCOUNT = 100;

interface Props {
    table: Table;
    order: Order;
    /** İndirim/ikram yetkisi (canCancelAndDiscount). */
    canDiscount: boolean;
    /** Masa menüsündeki "İndirim / İkram"dan gelindi: aynı ekran, İndirim / İkram sayfası açık başlar. */
    openDiscount?: boolean;
    onBack: () => void;
    /** fullyPaid: masa kapandı. Kısmi ödemede sipariş yenilenir. */
    onPaid: (fullyPaid: boolean) => void;
    onRequestBill: () => void;
}

// Telefon · Ödeme al. Garson kasa seçmez: ödeme açık kasalardan birinin gününe (vardiyasına) kendiliğinden yazılır;
// ödemeyi alan kişi garsondur. Bölme, indirim ve tutar kuralları kasiyer ekranıyla ortaktır (usePaymentSession).
export default function PaymentView({ table, order, canDiscount, openDiscount = false, onBack, onPaid, onRequestBill }: Props) {
    const [registers, setRegisters] = useState<OpenRegister[] | null>(null);
    const [registerId, setRegisterId] = useState<string | null>(null);
    const [iban, setIban] = useState<BranchPaymentSettings | null>(null);
    const [sheet, setSheet] = useState<'discount' | SplitTab | null>(openDiscount && canDiscount ? 'discount' : null);

    const pay = usePaymentSession({ order, canDiscount, maxDiscountPercent: WAITER_MAX_DISCOUNT, defaultMethod: 'nakit' });
    const {
        displayOrder, lines, itemsLocked, staged, lineDiscounts, bill, billDiscount, afterItems, remainingNet, hasStagedDiscount,
        split, people, splitPaid, peopleLeft, personShare, lastShare, selectedQuantities, selectedCount, coversAll, customAmount,
        net, restAfter, paymentMethod, setPaymentMethod, receivedInput, setReceivedInput, change, cashShort, paidTotal,
        isFree, submitting,
    } = pay;

    const loadRegisters = useCallback(() => {
        shiftService.getOpenRegisters()
            .then(list => {
                setRegisters(list);
                setRegisterId(prev => {
                    // Garson kasa seçmez: ödeme açık kasalardan birinin gününe kendiliğinden yazılır (önce bu cihazda
                    // daha önce kullanılan, yoksa listedeki ilk açık kasa).
                    if (prev && list.some(r => r.cashRegisterId === prev)) return prev;
                    const stored = readStoredRegister();
                    if (stored && list.some(r => r.cashRegisterId === stored)) return stored;
                    return list[0]?.cashRegisterId ?? null;
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

    const register = registers?.find(r => r.cashRegisterId === registerId) ?? null;
    const hasIban = !!iban?.iban;

    const header = (
        <header className="flex shrink-0 items-center gap-1 px-4 pt-3 pb-2">
            <button
                type="button"
                onClick={onBack}
                aria-label={`${table.name} masasına dön`}
                className="-ml-2 flex size-12 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <h2 className="min-w-0 truncate font-serif text-[24px] font-bold leading-tight text-foreground">{table.name} · Ödeme</h2>
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
                        <button
                            type="button"
                            onClick={onRequestBill}
                            className="h-14 rounded-2xl bg-foreground text-base font-bold text-background"
                        >
                            {displayOrder.billRequestedAt ? 'Kasaya yeniden bildir' : 'Hesap iste · kasaya bildir'}
                        </button>
                        <button type="button" onClick={onBack} className="h-14 rounded-2xl border border-border bg-card text-base font-semibold text-foreground">
                            Masaya dön
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const missing = !register ? 'Kasa hazırlanıyor…' : pay.missing(hasIban);
    const canComplete = !submitting && missing === null;
    const confirm = () => void pay.pay(canComplete, {
        registerName: register?.cashRegisterName,
        resolveRegister: async () => register?.cashRegisterId ?? null,
        onFullyPaid: () => onPaid(true),
        onPartiallyPaid: () => onPaid(false),
        // Kasa bu arada kapanmış olabilir: liste tazelenir (kalmadıysa "Açık kasa yok" ekranı gelir).
        onError: loadRegisters,
    });
    const buttonLabel = submitting ? 'İşleniyor…'
        : missing ?? (isFree ? 'İkramı kaydet · 0 ₺' : `${formatPrice(net)} ₺ ${METHOD_LABEL[paymentMethod ?? 'nakit']} Al`);
    const buttonDetail = submitting || missing ? null : restAfter > 0 ? `Sonra kalan ${formatPrice(restAfter)} ₺ · masa açık kalır` : 'Hesap kapanır';

    // Bölme çipi: hangi bölmenin sürdüğü; dokununca Hesabı böl açılır, ✕ bölmeyi iptal eder.
    const chipText = split === 'people'
        ? `Kişi ${splitPaid + 1}/${people} · ${formatPrice(personShare)} ₺`
        : split === 'items'
            ? (selectedCount > 0 ? `Ürünler · ${selectedCount} adet${coversAll ? ' · tümü' : ''}` : 'Ürünler · seçilmedi')
            : split === 'amount' ? `Tutar · ${formatPrice(customAmount ?? 0)} ₺` : null;
    const openSplit = () => setSheet(split === 'full' ? 'people' : split);
    const smallButton = 'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 text-[15px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45';

    return (
        <div className="relative flex h-full min-h-0 flex-col bg-[#F5F0E8] dark:bg-background">
            {header}
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-4">
                <div className="mx-auto flex w-full max-w-lg flex-col gap-3 *:shrink-0">
                    {/* Şimdi alınacak tutar */}
                    <section aria-label="Tutar" className="flex flex-col items-center gap-0.5 pt-1 pb-1 text-center">
                        <span className="text-[13px] font-medium text-rb-text-sub">{split === 'full' ? 'Alınacak' : 'Bu ödemede'}</span>
                        <p className="font-serif text-[48px] font-bold leading-none tabular-nums text-foreground" aria-live="polite" aria-atomic="true">
                            <span className="sr-only">Alınacak tutar: </span>{formatPrice(net)} ₺
                        </p>
                        <p className="mt-1 text-[13px] tabular-nums text-rb-text-sub">
                            Toplam {formatPrice(displayOrder.totalPrice)} · Ödenen {formatPrice(paidTotal)}
                            {split !== 'full' && ` · Kalan ${formatPrice(remainingNet)}`}
                        </p>
                    </section>

                    {hasStagedDiscount && (
                        <div className="flex flex-col gap-1">
                            <StagedDiscountList
                                lines={lines}
                                staged={staged}
                                lineDiscounts={lineDiscounts}
                                bill={bill}
                                billDiscount={billDiscount}
                                onRemoveLine={pay.removeLineDiscount}
                                onRemoveBill={pay.removeBillDiscount}
                            />
                            {split !== 'full' && (
                                <p className="text-[12px] text-rb-text-sub">
                                    {split === 'items'
                                        ? 'Ürün indirimi o ürün ödenirken, hesap indirimi hesabı kapatan ödemede uygulanır.'
                                        : 'İndirimler hesabı kapatan (son) ödemede uygulanır; kalan şimdiden indirimli gösterilir.'}
                                </p>
                            )}
                        </div>
                    )}

                    {chipText && (
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex max-w-full items-center rounded-full border border-rb-accent/35 bg-rb-accent-bg text-rb-accent">
                                <button
                                    type="button"
                                    onClick={openSplit}
                                    aria-label={`Bölme: ${chipText}. Değiştirmek için dokunun`}
                                    className="flex min-h-11 min-w-0 items-center gap-2 rounded-l-full pr-1 pl-4 text-sm font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Users className="size-4 shrink-0" aria-hidden="true" />
                                    <span className="truncate" aria-live="polite">{chipText}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={pay.cancelSplit}
                                    aria-label={split === 'people' ? 'Bölmeyi iptal et' : 'Seçimi iptal et, kalanın tamamını al'}
                                    className="flex size-11 shrink-0 items-center justify-center rounded-r-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                            {split === 'people' && peopleLeft > 1 && toKurus(lastShare) !== toKurus(personShare) && (
                                <p className="text-[12px] tabular-nums text-rb-text-sub">Kuruş farkı son kişide ({formatPrice(lastShare)} ₺).</p>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button type="button" onClick={openSplit} disabled={lines.length === 0 || remainingNet <= 0} className={smallButton}>
                            <Users className="size-4.5 text-rb-text-sub" aria-hidden="true" />Hesabı böl
                        </button>
                        {canDiscount && (
                            <button type="button" onClick={() => setSheet('discount')} disabled={lines.length === 0} className={smallButton}>
                                <Tag className="size-4.5 text-rb-text-sub" aria-hidden="true" />İndirim / İkram
                            </button>
                        )}
                    </div>

                    {isFree ? (
                        <p className="flex items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] text-foreground">
                            <Gift className="mt-0.5 size-4.5 shrink-0 text-rb-text-sub" aria-hidden="true" />
                            Ödenecek tutar 0 ₺: yöntem gerekmez, ikram olarak kaydedilir ve hesap kapanır.
                        </p>
                    ) : (
                        <>
                            <p id="waiter-pay-method" className="sr-only">Ödeme yöntemi</p>
                            <MethodCards
                                value={paymentMethod}
                                onChange={setPaymentMethod}
                                labelledBy="waiter-pay-method"
                                methods={WAITER_METHODS}
                                tone="waiter"
                                disabled={hasIban ? {} : { iban: 'IBAN tanımlı değil' }}
                            />
                            {!hasIban && iban !== null && (
                                <p className="-mt-1 text-[13px] text-rb-text-sub">IBAN tanımlı değil; yönetici Ayarlar → Ödeme sekmesinden ekleyebilir.</p>
                            )}
                            {paymentMethod === 'nakit' && (
                                <CashPanel net={net} receivedInput={receivedInput} onReceivedChange={setReceivedInput} change={change} cashShort={cashShort} tone="waiter" />
                            )}
                            {paymentMethod === 'kart' && <CardPanel net={net} tone="waiter" />}
                            {paymentMethod === 'iban' && hasIban && iban && (
                                <IbanPanel
                                    net={net}
                                    settings={iban}
                                    reference={`${table.name} · #${String(displayOrder.id).replace(/-/g, '').slice(0, 6).toUpperCase()}`}
                                    tone="waiter"
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={confirm}
                    disabled={!canComplete}
                    aria-busy={submitting}
                    className="mx-auto flex min-h-16 w-full max-w-lg items-center justify-center gap-2.5 rounded-2xl bg-foreground px-4 py-2 text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                >
                    {canComplete && <Check className="size-5.5 shrink-0" aria-hidden="true" />}
                    <span className="flex flex-col items-center leading-tight">
                        <span className="text-[17px] font-bold tabular-nums">{buttonLabel}</span>
                        {buttonDetail && <span className="text-[13px] font-medium tabular-nums opacity-80">{buttonDetail}</span>}
                    </span>
                </button>
            </div>

            {sheet === 'discount' && canDiscount && (
                <PaymentSheet title="İndirim / İkram" description="Hesaba ya da bir ürüne; ödeme alınırken uygulanır." onClose={() => setSheet(null)}>
                    <PaymentDiscountEditor
                        lines={lines}
                        billBase={afterItems}
                        maxDiscountPercent={WAITER_MAX_DISCOUNT}
                        onApplyBill={d => { pay.applyBillDiscount(d); setSheet(null); }}
                        onApplyLine={(key, d) => { pay.applyLineDiscount(key, d); setSheet(null); }}
                        onCancel={() => setSheet(null)}
                        tone="waiter"
                    />
                </PaymentSheet>
            )}
            {sheet && sheet !== 'discount' && (
                <PaymentSplitDialog
                    initialTab={sheet}
                    lines={lines}
                    lineDiscounts={lineDiscounts}
                    maxDiscountPercent={WAITER_MAX_DISCOUNT}
                    remainingNet={remainingNet}
                    itemsLocked={itemsLocked}
                    people={people}
                    splitPaid={splitPaid}
                    selectedQuantities={selectedQuantities}
                    customAmount={customAmount}
                    onApplyPeople={count => { pay.applyPeople(count); setSheet(null); }}
                    onApplyItems={selection => { pay.applyItems(selection); setSheet(null); }}
                    onApplyAmount={amount => { pay.applyAmount(amount); setSheet(null); }}
                    onClose={() => setSheet(null)}
                    shell={PaymentSheet}
                    tone="waiter"
                />
            )}
        </div>
    );
}
