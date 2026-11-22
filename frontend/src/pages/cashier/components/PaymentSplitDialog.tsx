import { useState, type ComponentType } from 'react';
import { Minus, Plus } from 'lucide-react';
import { buildPayItems, round2, type BillLine, type LineDiscount } from '@/features/cashier/billLines';
import { amountText, MAX_PEOPLE, parseMoney, splitShare, toKurus } from '@/features/cashier/paymentMath';
import { formatPrice } from '@/lib/format';
import PaymentDialog, { type PaymentShellProps } from './PaymentDialog';
import { TONE, type PaymentTone } from './paymentTone';

/** Hesabı Böl penceresinin sekmeleri: eşit böl · ürünlere göre · belirli tutar. */
export type SplitTab = 'people' | 'items' | 'amount';

const TABS: [SplitTab, string][] = [['people', 'Eşit böl'], ['items', 'Ürünlere göre'], ['amount', 'Belirli tutar']];

interface Props {
    initialTab: SplitTab;
    lines: BillLine[];
    lineDiscounts: Record<string, LineDiscount>;
    maxDiscountPercent: number;
    /** Hesabı kapatmak için kalan (bekleyen indirimler düşülmüş). */
    remainingNet: number;
    /** Tutar girilerek ödeme alınmış hesapta sunucu ürün seçerek ödemeyi kabul etmez. */
    itemsLocked: boolean;
    /** Süren eşit bölmede kişi sayısı ve ödeyen kişi sayısı. */
    people: number;
    splitPaid: number;
    selectedQuantities: Record<string, number>;
    customAmount: number | null;
    onApplyPeople: (people: number) => void;
    onApplyItems: (selection: Record<string, number>) => void;
    onApplyAmount: (amount: number) => void;
    onClose: () => void;
    /** Kabuk: kasiyer ekranında ortada pencere (varsayılan), garson ekranında alttan açılan sayfa. */
    shell?: ComponentType<PaymentShellProps>;
    tone?: PaymentTone;
}

const stepperButton = 'flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30';

/**
 * "Hesabı Böl": bu ödemede ne kadar alınacağı burada seçilir. Seçim taslaktır; "Uygula" ile ödeme ekranına geçer.
 * Ürün seçimi de pencerede yapılır: soldaki hesap listesi her zaman sabit bir özet olarak kalır.
 */
export default function PaymentSplitDialog({
    initialTab, lines, lineDiscounts, maxDiscountPercent, remainingNet, itemsLocked, people: currentPeople, splitPaid,
    selectedQuantities, customAmount, onApplyPeople, onApplyItems, onApplyAmount, onClose, shell: Shell = PaymentDialog, tone = 'admin',
}: Props) {
    const t = TONE[tone];
    const [tab, setTab] = useState<SplitTab>(initialTab === 'items' && itemsLocked ? 'people' : initialTab);
    const minPeople = Math.max(2, splitPaid + 1);
    const [people, setPeople] = useState(() => Math.min(Math.max(currentPeople, minPeople), MAX_PEOPLE));
    const [selection, setSelection] = useState<Record<string, number>>(selectedQuantities);
    const [amountInput, setAmountInput] = useState(customAmount !== null ? amountText(customAmount) : '');

    // Eşit böl önizlemesi: kalan, henüz ödemeyen kişilere bölünür; kuruş artığı son kişide.
    const peopleLeft = Math.max(people - splitPaid, 1);
    const share = splitShare(remainingNet, peopleLeft);
    const lastShare = round2(remainingNet - share * (peopleLeft - 1));

    // Ürünlere göre: seçilen adetler + o ürünlerin bekleyen indirimleri.
    const selectedTotal = round2(lines.reduce((sum, line) => sum + (selection[line.key] ?? 0) * line.unitPrice, 0));
    const plan = buildPayItems(lines, line => selection[line.key] ?? 0, lineDiscounts, maxDiscountPercent);
    const selectedDiscount = Math.min(plan.itemDiscount, selectedTotal);
    const selectedNet = Math.max(round2(selectedTotal - selectedDiscount), 0);
    const coversAll = lines.length > 0 && lines.every(line => (selection[line.key] ?? 0) === line.quantity);
    const setQty = (line: BillLine, value: number) =>
        setSelection(prev => ({ ...prev, [line.key]: Math.min(Math.max(Number.isFinite(value) ? Math.trunc(value) : 0, 0), line.quantity) }));

    // Belirli tutar: kalandan fazla olamaz.
    const amount = parseMoney(amountInput);
    const amountTooHigh = toKurus(amount) > toKurus(remainingNet);

    const ready = tab === 'people' ? remainingNet > 0
        : tab === 'items' ? !itemsLocked && selectedTotal > 0
        : amount > 0 && !amountTooHigh;
    const apply = () => {
        if (!ready) return;
        if (tab === 'people') onApplyPeople(people);
        else if (tab === 'items') onApplyItems(selection);
        else onApplyAmount(amount);
    };
    const applyLabel = tab === 'people' ? `${people} kişiye böl`
        : tab === 'items' ? (selectedTotal > 0 ? `Seçilenleri al · ${formatPrice(selectedNet)} ₺` : 'Ürün seçin')
        : amount > 0 && !amountTooHigh ? `${formatPrice(amount)} ₺ al` : 'Tutar girin';

    const footer = (
        <div className="flex gap-2">
            <button
                type="button"
                onClick={onClose}
                className="h-12 flex-1 rounded-xl border border-border text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                Vazgeç
            </button>
            <button
                type="button"
                onClick={apply}
                disabled={!ready}
                className={`h-12 flex-[2] rounded-xl ${t.primary} px-3 text-sm font-semibold tabular-nums transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40`}
            >
                {applyLabel}
            </button>
        </div>
    );

    return (
        <Shell title="Hesabı Böl" description={`Kalan ${formatPrice(remainingNet)} ₺ · bu ödemede ne kadar alınacak?`} onClose={onClose} footer={footer}>
            <div role="tablist" aria-label="Bölme şekli" className="grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
                {TABS.map(([key, label]) => {
                    const disabled = key === 'items' && itemsLocked;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            id={`split-tab-${key}`}
                            aria-selected={tab === key}
                            aria-controls={`split-panel-${key}`}
                            disabled={disabled}
                            title={disabled ? 'Tutar girilerek ödeme alınmış hesapta ürün seçilemez' : undefined}
                            onClick={() => setTab(key)}
                            className={`min-h-11 rounded-lg px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
                                tab === key ? t.on : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
            {itemsLocked && (
                <p className="mt-2 text-xs text-muted-foreground">
                    Bu hesaptan tutar girilerek ödeme alındı; ürün seçilemez, kalan eşit bölünerek ya da tutarla alınır.
                </p>
            )}

            {tab === 'people' && (
                <div id="split-panel-people" role="tabpanel" aria-labelledby="split-tab-people" className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <span id="split-people-label" className="text-sm text-foreground">
                            Kaç kişi ödeyecek?
                            <span className="block text-xs text-muted-foreground">
                                {splitPaid > 0 ? `${splitPaid} kişi ödedi; kalan ${peopleLeft} kişiye bölünür.` : 'Kalan tutar eşit bölünür.'}
                            </span>
                        </span>
                        <div className="flex items-center gap-1 rounded-xl border border-border p-1" role="group" aria-labelledby="split-people-label">
                            <button type="button" onClick={() => setPeople(p => Math.max(p - 1, minPeople))} disabled={people <= minPeople} aria-label="Kişi sayısını azalt" className={stepperButton}>
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-10 text-center text-xl font-semibold tabular-nums text-foreground" aria-live="polite">{people}</span>
                            <button type="button" onClick={() => setPeople(p => Math.min(p + 1, MAX_PEOPLE))} disabled={people >= MAX_PEOPLE} aria-label="Kişi sayısını artır" className={stepperButton}>
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div className="rounded-xl bg-rb-accent-bg px-4 py-3" aria-live="polite">
                        <p className="text-sm text-muted-foreground">Kişi başı</p>
                        <p className="font-serif text-3xl font-bold tabular-nums text-foreground">{formatPrice(share)} ₺</p>
                        {peopleLeft > 1 && toKurus(lastShare) !== toKurus(share) && (
                            <p className="mt-1 text-xs tabular-nums text-muted-foreground">Kuruş farkı son kişide: son kişi {formatPrice(lastShare)} ₺ öder.</p>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">Her ödemeden sonra sıradaki kişiye geçilir.</p>
                </div>
            )}

            {tab === 'items' && !itemsLocked && (
                <div id="split-panel-items" role="tabpanel" aria-labelledby="split-tab-items" className="mt-4">
                    <div className="mb-1 flex min-h-11 items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Bu ödemede ödenecek adetler</p>
                        <button
                            type="button"
                            onClick={() => setSelection(coversAll ? {} : Object.fromEntries(lines.map(line => [line.key, line.quantity])))}
                            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-rb-accent transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {coversAll ? 'Seçimi temizle' : 'Tümünü seç'}
                        </button>
                    </div>
                    <ul className="divide-y divide-border rounded-xl border border-border">
                        {lines.map(line => {
                            const qty = selection[line.key] ?? 0;
                            return (
                                <li key={line.key} className={`flex items-center justify-between gap-3 px-3 py-2 ${qty > 0 ? 'bg-rb-accent-bg' : ''}`}>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">{line.productName}</p>
                                        <p className="text-xs tabular-nums text-muted-foreground">{line.quantity} adet × {formatPrice(line.unitPrice)} ₺</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                                        <button type="button" onClick={() => setQty(line, qty - 1)} disabled={qty === 0} aria-label={`${line.productName}: adedi azalt`} className={stepperButton}>
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <input
                                            type="number"
                                            value={qty}
                                            min={0}
                                            max={line.quantity}
                                            onChange={e => setQty(line, e.target.valueAsNumber)}
                                            aria-label={`${line.productName}: bu ödemede ödenecek adet (en fazla ${line.quantity})`}
                                            className={`w-8 bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${qty > 0 ? 'text-foreground' : 'text-muted-foreground'}`}
                                        />
                                        <button type="button" onClick={() => setQty(line, qty + 1)} disabled={qty >= line.quantity} aria-label={`${line.productName}: adedi artır`} className={stepperButton}>
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-3 text-sm tabular-nums text-foreground" aria-live="polite">
                        {selectedTotal > 0
                            ? <>Seçili <span className="font-semibold">{formatPrice(selectedNet)} ₺</span>
                                {selectedDiscount > 0 && <span className="text-muted-foreground"> (indirim −{formatPrice(selectedDiscount)} ₺)</span>}
                                {coversAll && <span className="text-muted-foreground"> · tümü seçili, hesap kapanır</span>}</>
                            : <span className="text-muted-foreground">Henüz ürün seçilmedi.</span>}
                    </p>
                </div>
            )}

            {tab === 'amount' && (
                <div id="split-panel-amount" role="tabpanel" aria-labelledby="split-tab-amount" className="mt-5 space-y-2">
                    <label htmlFor="split-amount" className="block text-sm text-foreground">Bu ödemede alınacak tutar</label>
                    <div className="relative">
                        <input
                            id="split-amount"
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            value={amountInput}
                            onChange={e => setAmountInput(e.target.value.replace(/[^\d.,]/g, ''))}
                            onKeyDown={e => { if (e.key === 'Enter') apply(); }}
                            placeholder={amountText(remainingNet)}
                            aria-invalid={amountTooHigh}
                            aria-describedby="split-amount-hint"
                            className={`h-14 w-full rounded-xl border bg-muted/50 pr-10 pl-4 text-2xl font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${amountTooHigh ? 'border-rb-red' : 'border-border'}`}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg font-semibold text-muted-foreground" aria-hidden="true">₺</span>
                    </div>
                    <p id="split-amount-hint" className={`text-sm tabular-nums ${amountTooHigh ? 'font-semibold text-rb-red' : 'text-muted-foreground'}`} aria-live="polite">
                        {amountTooHigh
                            ? `Kalan tutardan (${formatPrice(remainingNet)} ₺) fazla olamaz.`
                            : amount > 0
                                ? toKurus(amount) === toKurus(remainingNet)
                                    ? 'Kalanın tamamı: hesap kapanır.'
                                    : `Kısmi ödeme: ürünler masada kalır, sonra kalan ${formatPrice(round2(remainingNet - amount))} ₺.`
                                : 'Kısmi ödemede ürünler masada kalır; indirimler hesabı kapatan ödemede uygulanır.'}
                    </p>
                </div>
            )}
        </Shell>
    );
}
