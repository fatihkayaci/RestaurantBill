import { useState } from 'react';
import { Gift, Minus, Plus, Tag, X } from 'lucide-react';
import { describeLineDiscount, lineDiscountAmount, round2, type BillLine, type LineDiscount } from '@/features/cashier/billLines';
import { parseMoney, type DiscountKind, type StagedBillDiscount, type StagedDiscount, type StagedDiscounts, type StagedLineDiscount } from '@/features/cashier/paymentMath';
import { describeBillDiscount } from '@/features/cashier/usePaymentSession';
import { formatPrice } from '@/lib/format';
import { TONE, type PaymentTone } from './paymentTone';

export type { DiscountKind, StagedBillDiscount, StagedDiscount, StagedDiscounts, StagedLineDiscount };

interface Props {
    lines: BillLine[];
    /** Ürün indirimleri sonrası hesap (hesap indiriminin uygulanacağı tutar). */
    billBase: number;
    maxDiscountPercent: number;
    onApplyBill: (discount: StagedBillDiscount) => void;
    onApplyLine: (lineKey: string, discount: StagedLineDiscount) => void;
    onCancel: () => void;
    tone?: PaymentTone;
}

const KINDS: [DiscountKind, string][] = [['percent', '%'], ['amount', '₺'], ['ikram', 'İkram (ücretsiz)']];

const segmentClass = (on: boolean, tone: PaymentTone) =>
    `${TONE[tone].control} rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        on ? TONE[tone].on : 'text-muted-foreground hover:text-foreground'
    }`;

/**
 * "İndirim / İkram Ekle" gövdesi: hesabın ya da bir ürünün indirimi tek yerden girilir. Kabuğu çağıran verir
 * (kasiyer ekranında pencere, garson ekranında alttan açılan sayfa).
 */
export default function PaymentDiscountEditor({ lines, billBase, maxDiscountPercent, onApplyBill, onApplyLine, onCancel, tone = 'admin' }: Props) {
    const t = TONE[tone];
    const [scope, setScope] = useState<'bill' | 'item'>('bill');
    const [lineKey, setLineKey] = useState<string>(lines[0]?.key ?? '');
    const [quantity, setQuantity] = useState<number | null>(null);
    const [kind, setKind] = useState<DiscountKind>('percent');
    const [input, setInput] = useState('');
    const [note, setNote] = useState('');

    const line = lines.find(l => l.key === lineKey);
    const discountQty = line ? Math.min(quantity ?? line.quantity, line.quantity) : 0;
    const base = scope === 'bill' ? billBase : line ? round2(line.unitPrice * discountQty) : 0;
    const value = kind === 'ikram' ? 100 : parseMoney(input);
    const discount = kind === 'amount' ? value : round2(base * Math.min(value, 100) / 100);
    const percentOf = kind === 'amount' ? (base > 0 ? value * 100 / base : 0) : value;
    const overBase = kind === 'amount' && value > base;
    const overLimit = percentOf > maxDiscountPercent;
    const ready = base > 0 && value > 0 && !overBase && !overLimit && (scope === 'bill' || !!line);

    const apply = () => {
        if (!ready) return;
        const trimmed = note.trim() || (kind === 'ikram' ? 'İkram' : '');
        if (scope === 'bill') onApplyBill({ kind, value, note: trimmed });
        else if (line) onApplyLine(line.key, { kind, value, note: trimmed, quantity: discountQty < line.quantity ? discountQty : undefined });
    };

    return (
        // Ödeme ekranındaki "İndirim / İkram Ekle" penceresinin gövdesi; başlık ve kapatma pencereden gelir.
        <div className="space-y-4">

            <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Neye?</p>
                <div className="inline-grid grid-cols-2 gap-1 rounded-xl border border-border p-1">
                    <button type="button" aria-pressed={scope === 'bill'} onClick={() => setScope('bill')} className={segmentClass(scope === 'bill', tone)}>Tüm hesap</button>
                    <button type="button" aria-pressed={scope === 'item'} onClick={() => setScope('item')} className={segmentClass(scope === 'item', tone)}>Ürün seç</button>
                </div>
            </div>

            {scope === 'item' && (
                <div className="space-y-2">
                    <label htmlFor="discount-line" className="block text-xs text-muted-foreground">Ürün</label>
                    <select
                        id="discount-line"
                        value={lineKey}
                        onChange={e => { setLineKey(e.target.value); setQuantity(null); }}
                        className={`${t.control} w-full rounded-lg border border-border bg-muted/50 px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring`}
                    >
                        {lines.map(l => (
                            <option key={l.key} value={l.key}>{`${l.productName} ×${l.quantity} · ${formatPrice(l.unitPrice * l.quantity)} ₺`}</option>
                        ))}
                    </select>
                    {line && line.quantity > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Kaç adede?</span>
                            <div className="flex items-center gap-1 rounded-lg border border-border px-1 py-0.5">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, discountQty - 1))}
                                    disabled={discountQty <= 1}
                                    aria-label="İndirimli adedi azalt"
                                    className={`flex ${t.step} items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30`}
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-14 text-center text-sm font-semibold tabular-nums text-foreground" aria-live="polite">
                                    {discountQty} / {line.quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.min(line.quantity, discountQty + 1))}
                                    disabled={discountQty >= line.quantity}
                                    aria-label="İndirimli adedi artır"
                                    className={`flex ${t.step} items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30`}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Tür</p>
                <div className="grid grid-cols-[1fr_1fr_2fr] gap-1 rounded-xl border border-border p-1">
                    {KINDS.map(([key, label]) => (
                        <button key={key} type="button" aria-pressed={kind === key} onClick={() => { setKind(key); setInput(''); }} className={segmentClass(kind === key, tone)}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {kind !== 'ikram' && (
                <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={input}
                    onChange={e => setInput(e.target.value.replace(/[^\d.,]/g, ''))}
                    placeholder={kind === 'percent' ? 'Yüzde (%)' : scope === 'item' && discountQty > 1 ? `${discountQty} adedin toplam indirimi (₺)` : 'Tutar (₺)'}
                    aria-label={kind === 'percent' ? 'İndirim yüzdesi' : 'İndirim tutarı'}
                    aria-invalid={overBase || overLimit}
                    className={`h-11 w-full rounded-lg border bg-muted/50 px-3 text-base tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${overBase || overLimit ? 'border-rb-red' : 'border-border'}`}
                />
            )}
            <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={300}
                placeholder="Not (isteğe bağlı)"
                aria-label="İndirim notu"
                className={`${t.control} w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring`}
            />

            <p className={`text-xs ${overBase || overLimit ? 'font-semibold text-rb-red' : 'text-muted-foreground'}`}>
                {overBase
                    ? `İndirim ${formatPrice(base)} ₺ tutarından fazla olamaz.`
                    : overLimit
                        ? `En fazla %${maxDiscountPercent} indirim uygulayabilirsiniz.`
                        : value > 0 && base > 0
                            ? `−${formatPrice(Math.min(discount, base))} ₺ · ${scope === 'bill' ? 'hesabı kapatan ödemede uygulanır' : 'ürün ödenirken uygulanır'}`
                            : maxDiscountPercent < 100
                                ? `En fazla %${maxDiscountPercent} indirim uygulayabilirsiniz.`
                                : scope === 'bill' ? 'Ürün indirimlerinden sonra kalan hesaba uygulanır.' : 'Yüzde her adede ayrı uygulanır; ₺ tutar seçilen adetlerin toplam indirimidir.'}
            </p>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-11 flex-1 rounded-xl border border-border text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    Vazgeç
                </button>
                <button
                    type="button"
                    onClick={apply}
                    disabled={!ready}
                    className={`h-11 flex-1 rounded-xl ${t.primary} text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40`}
                >
                    Uygula
                </button>
            </div>
        </div>
    );
}

export function DiscountIcon({ ikram }: { ikram: boolean }) {
    return ikram
        ? <Gift className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        : <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

interface StagedListProps {
    lines: BillLine[];
    staged: StagedDiscounts;
    lineDiscounts: Record<string, LineDiscount>;
    bill?: StagedBillDiscount;
    billDiscount: number;
    onRemoveLine: (lineKey: string) => void;
    onRemoveBill: () => void;
}

/** Bekleyen (henüz gönderilmemiş) indirimler; her satır kaldırılabilir. Kasiyer ve garson ekranında ortak. */
export function StagedDiscountList({ lines, staged, lineDiscounts, bill, billDiscount, onRemoveLine, onRemoveBill }: StagedListProps) {
    const removeButton = (label: string, onClick: () => void) => (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title="Kaldır"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <X className="h-4 w-4" />
        </button>
    );
    return (
        <ul className="space-y-1" aria-label="Uygulanan indirimler">
            {lines.filter(line => lineDiscounts[line.key]).map(line => {
                const d = staged.lines[line.key];
                return (
                    <li key={line.key} className="flex items-center justify-between gap-2 rounded-lg bg-rb-red-bg py-0.5 pr-0.5 pl-3">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-rb-red">
                            <DiscountIcon ikram={d.kind === 'ikram'} />
                            <span className="min-w-0 truncate">
                                {line.productName} · {d.kind === 'ikram' ? `ikram${d.quantity ? ` ${d.quantity} adet` : ''}` : describeLineDiscount(lineDiscounts[line.key], line.quantity)}
                                {d.note && d.note !== 'İkram' && <span className="text-muted-foreground"> · {d.note}</span>}
                            </span>
                        </span>
                        <span className="flex shrink-0 items-center">
                            <span className="text-sm font-semibold tabular-nums text-rb-red">−{formatPrice(lineDiscountAmount(line.unitPrice, line.quantity, lineDiscounts[line.key]))} ₺</span>
                            {removeButton(`${line.productName}: indirimi kaldır`, () => onRemoveLine(line.key))}
                        </span>
                    </li>
                );
            })}
            {bill && (
                <li className="flex items-center justify-between gap-2 rounded-lg bg-rb-red-bg py-0.5 pr-0.5 pl-3">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm text-rb-red">
                        <DiscountIcon ikram={bill.kind === 'ikram'} />
                        <span className="min-w-0 truncate">
                            {describeBillDiscount(bill)}
                            {bill.note && bill.note !== 'İkram' && <span className="text-muted-foreground"> · {bill.note}</span>}
                        </span>
                    </span>
                    <span className="flex shrink-0 items-center">
                        <span className="text-sm font-semibold tabular-nums text-rb-red">−{formatPrice(billDiscount)} ₺</span>
                        {removeButton('Hesap indirimini kaldır', onRemoveBill)}
                    </span>
                </li>
            )}
        </ul>
    );
}
