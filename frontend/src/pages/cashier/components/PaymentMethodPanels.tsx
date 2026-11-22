import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Banknote, Check, Copy, CreditCard, Landmark, QrCode, type LucideIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import type { BranchPaymentSettings } from '@/features/branches/api/paymentSettingsService';
import { round2 } from '@/features/cashier/billLines';
import { amountText, cashQuickAmounts, parseMoney, toKurus, type PaymentMethod } from '@/features/cashier/paymentMath';
import { formatAmount, formatPrice } from '@/lib/format';
import type { PaymentTone } from './paymentTone';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: LucideIcon }[] = [
    { key: 'nakit', label: 'Nakit', icon: Banknote },
    { key: 'kart', label: 'Kart', icon: CreditCard },
    { key: 'qr', label: 'QR', icon: QrCode },
    { key: 'iban', label: 'IBAN', icon: Landmark },
];

interface MethodCardsProps {
    value: PaymentMethod | null;
    onChange: (method: PaymentMethod) => void;
    disabled: Partial<Record<PaymentMethod, string>>;
    labelledBy: string;
    /** Gösterilen yöntemler (sırası korunur); garson ekranında QR yok. */
    methods?: PaymentMethod[];
    tone?: PaymentTone;
}

const GRID_COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

/**
 * Yöntem kartları: radiogroup. Ok tuşları seçimi kapalı olmayan bir sonraki/önceki karta taşır (Home/End uçlara);
 * sekme sırasında yalnızca seçili (yoksa ilk açık) kart durur.
 */
export function MethodCards({ value, onChange, disabled, labelledBy, methods, tone = 'admin' }: MethodCardsProps) {
    const refs = useRef<Record<string, HTMLButtonElement | null>>({});
    const shown = methods ? PAYMENT_METHODS.filter(m => methods.includes(m.key)) : PAYMENT_METHODS;
    const waiter = tone === 'waiter';
    const enabled = shown.filter(m => !disabled[m.key]).map(m => m.key);
    const focusKey = value && enabled.includes(value) ? value : enabled[0];

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (enabled.length === 0) return;
        const index = focusKey ? enabled.indexOf(focusKey) : -1;
        let next: PaymentMethod | undefined;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = enabled[(index + 1) % enabled.length];
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = enabled[(index - 1 + enabled.length) % enabled.length];
        else if (event.key === 'Home') next = enabled[0];
        else if (event.key === 'End') next = enabled[enabled.length - 1];
        if (!next) return;
        event.preventDefault();
        onChange(next);
        refs.current[next]?.focus();
    };

    return (
        <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown} className={`grid ${GRID_COLS[shown.length] ?? 'grid-cols-4'} gap-2 sm:gap-3`}>
            {shown.map(({ key, label, icon: Icon }) => {
                const selected = value === key;
                const reason = disabled[key];
                return (
                    <button
                        key={key}
                        ref={el => { refs.current[key] = el; }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-disabled={!!reason || undefined}
                        disabled={!!reason}
                        tabIndex={key === focusKey ? 0 : -1}
                        title={reason}
                        onClick={() => onChange(key)}
                        className={`relative flex ${waiter ? 'min-h-18 gap-1.5 font-bold' : 'min-h-22 gap-2 font-semibold'} flex-col items-center justify-center rounded-2xl border-[1.5px] px-1 py-3 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 ${
                            selected
                                ? waiter ? 'border-foreground bg-foreground text-background' : 'border-rb-accent bg-rb-accent text-rb-accent-foreground shadow-sm'
                                : 'border-border bg-card text-foreground hover:border-muted-foreground'
                        }`}
                    >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                        {label}
                        {selected && (
                            <span className={`absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full ${waiter ? 'bg-background text-foreground' : 'bg-rb-accent-foreground text-rb-accent'}`} aria-hidden="true">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function PanelShell({ icon: Icon, title, children, tone = 'admin' }: { icon: LucideIcon; title: string; children: ReactNode; tone?: PaymentTone }) {
    // Garson ekranında başlık yok: seçili yöntem kartı hemen üstünde, yer dar.
    if (tone === 'waiter') {
        return <section className="space-y-3 rounded-2xl border border-border bg-card p-3.5" aria-label={title}>{children}</section>;
    }
    return (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-label={title}>
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-foreground">
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                {title}
            </h3>
            {children}
        </section>
    );
}

const amountBox = (net: number) => (
    <div className="flex items-baseline justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">Tahsil edilecek</span>
        <span className="font-serif text-2xl font-bold tabular-nums text-foreground">{formatPrice(net)} ₺</span>
    </div>
);

interface CashPanelProps {
    net: number;
    receivedInput: string;
    onReceivedChange: (value: string) => void;
    change: number | null;
    cashShort: boolean;
    tone?: PaymentTone;
}

/** Nakit: alınan para + hızlı tutarlar + para üstü. Alınan para boşsa tam tutar alınmış sayılır. */
export function CashPanel({ net, receivedInput, onReceivedChange, change, cashShort, tone = 'admin' }: CashPanelProps) {
    const waiter = tone === 'waiter';
    const received = parseMoney(receivedInput);
    const quick = cashQuickAmounts(net);
    return (
        <PanelShell icon={Banknote} title="Nakit Ödeme" tone={tone}>
            <div className="space-y-1.5">
                <label htmlFor="cash-received" className="block text-sm text-muted-foreground">{waiter ? 'Alınan para' : 'Alınan Para'} <span className="text-xs">· boşsa tam tutar</span></label>
                <div className="relative">
                    <input
                        id="cash-received"
                        type="text"
                        inputMode="decimal"
                        value={receivedInput}
                        onChange={e => onReceivedChange(e.target.value.replace(/[^\d.,]/g, ''))}
                        placeholder={amountText(net)}
                        aria-invalid={cashShort}
                        aria-describedby="cash-change"
                        className={`h-14 w-full rounded-xl border bg-background pr-10 pl-4 text-2xl font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${cashShort ? 'border-rb-red' : 'border-border'}`}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg font-semibold text-muted-foreground" aria-hidden="true">₺</span>
                </div>
            </div>
            {quick.length > 0 && (
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Hızlı tutarlar">
                    {quick.map(value => {
                        const on = !!receivedInput && toKurus(received) === toKurus(value);
                        return (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={on}
                                onClick={() => onReceivedChange(on ? '' : amountText(value))}
                                className={`min-h-11 rounded-xl border px-1 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    on
                                        ? waiter ? 'border-foreground bg-foreground text-background' : 'border-rb-accent bg-rb-accent-bg text-rb-accent'
                                        : 'border-border bg-background text-foreground hover:bg-muted'
                                }`}
                            >
                                {formatPrice(value)} ₺
                            </button>
                        );
                    })}
                </div>
            )}
            <div
                id="cash-change"
                aria-live="polite"
                className={`flex items-baseline justify-between gap-3 rounded-xl px-4 py-3 ${cashShort ? 'bg-rb-red-bg text-rb-red' : 'bg-rb-green-bg text-rb-green'}`}
            >
                <span className="text-base font-semibold">{cashShort ? 'Eksik' : waiter ? 'Para üstü' : 'Para Üstü'}</span>
                <span className="font-serif text-2xl font-bold tabular-nums">
                    {formatPrice(cashShort ? round2(net - received) : change ?? 0)} ₺
                </span>
            </div>
        </PanelShell>
    );
}

/**
 * Kart: bu ekran bir POS cihazına bağlı değil. Kasiyer cihazdan çeker, onay slibi çıkınca ödemeyi kaydeder;
 * ekran başarı taklidi yapmaz.
 */
export function CardPanel({ net, tone = 'admin' }: { net: number; tone?: PaymentTone }) {
    if (tone === 'waiter') {
        return (
            <PanelShell icon={CreditCard} title="Kart ile Ödeme" tone={tone}>
                <p className="flex items-start gap-3 text-[15px] text-foreground">
                    <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span>POS cihazından <strong className="tabular-nums">{formatPrice(net)} ₺</strong> çekin, onaylanınca alttaki butona basın.</span>
                </p>
            </PanelShell>
        );
    }
    return (
        <PanelShell icon={CreditCard} title="Kart ile Ödeme">
            {amountBox(net)}
            <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground marker:text-muted-foreground">
                <li>Tutarı POS cihazından çekin.</li>
                <li>Cihaz onayladıktan (slip çıktıktan) sonra <strong>Ödemeyi Tamamla</strong>'ya basın.</li>
            </ol>
            <p className="text-xs text-muted-foreground">Bu ekran POS cihazına bağlı değildir; ödeme siz onaylayınca Kart olarak kaydedilir.</p>
        </PanelShell>
    );
}

/** QR: bağlı bir QR ödeme sağlayıcısı yok; ödeme kasiyer doğruladıktan sonra elle kaydedilir. */
export function QrPanel({ net }: { net: number }) {
    return (
        <PanelShell icon={QrCode} title="QR ile Ödeme">
            {amountBox(net)}
            <p className="text-sm text-foreground">
                Müşteri QR ile (banka uygulaması ya da POS cihazının QR'ı) ödedikten sonra ödemenin geldiğini kendi cihazınızda
                doğrulayın, sonra <strong>Ödemeyi Tamamla</strong>'ya basın.
            </p>
            <p className="text-xs text-muted-foreground">Sistemde bağlı bir QR ödeme sağlayıcısı yok; ödeme otomatik doğrulanmaz, siz onaylayınca QR olarak kaydedilir.</p>
        </PanelShell>
    );
}

interface IbanPanelProps {
    net: number;
    settings: BranchPaymentSettings;
    reference: string;
    tone?: PaymentTone;
}

async function copyText(text: string, what: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(`${what} kopyalandı.`);
    } catch {
        toast.error(`${what} kopyalanamadı.`);
    }
}

/** IBAN: şubenin hesabı, tutar ve açıklama (kopyalanabilir) + müşterinin tarayabileceği düz metin QR. */
export function IbanPanel({ net, settings, reference, tone = 'admin' }: IbanPanelProps) {
    const waiter = tone === 'waiter';
    const iban = settings.ibanFormatted || settings.iban;
    const qrText = [
        `IBAN: ${iban}`,
        `Alıcı: ${settings.accountHolderName}`,
        `Tutar: ${formatAmount(net)} TL`,
        `Açıklama: ${reference}`,
    ].join('\n');
    const rows: { label: string; value: string; copy?: [string, string]; mono?: boolean; strong?: boolean }[] = [
        { label: 'IBAN', value: iban, copy: [settings.iban, 'IBAN'], mono: true },
        { label: 'Alıcı', value: settings.accountHolderName },
        ...(settings.bankName ? [{ label: 'Banka', value: settings.bankName }] : []),
        { label: 'Tutar', value: `${formatAmount(net)} ₺`, copy: [amountText(net), 'Tutar'], strong: true },
        { label: 'Açıklama', value: reference, copy: [reference, 'Açıklama'] },
    ];
    return (
        <PanelShell icon={Landmark} title="IBAN ile Ödeme" tone={tone}>
            <div className="flex flex-wrap items-start gap-4">
                <div className="shrink-0 rounded-lg bg-white p-2">
                    <QRCodeSVG value={qrText} size={112} aria-label="IBAN bilgisi QR kodu: müşteri telefonla tarayıp kopyalayabilir" />
                </div>
                {/* Garson telefonunda satırlar dar: etiket üstte, değer ve kopyala altta tam genişlikte. */}
                {waiter && (
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 self-stretch">
                        <span className="text-[13px] text-muted-foreground">Müşteri telefonuyla okutsun</span>
                        <span className="font-serif text-2xl font-bold tabular-nums text-foreground">{formatPrice(net)} ₺</span>
                    </div>
                )}
                <dl className={`${waiter ? 'w-full' : 'min-w-56 flex-1'} divide-y divide-border text-sm`}>
                    {rows.map(row => (
                        <div key={row.label} className={waiter ? 'flex min-h-11 flex-col py-1' : 'flex min-h-11 items-center justify-between gap-2 py-1'}>
                            <dt className={`shrink-0 text-muted-foreground ${waiter ? 'text-xs' : ''}`}>{row.label}</dt>
                            <dd className={`flex min-w-0 items-center gap-1 ${waiter ? 'justify-between' : ''}`}>
                                <span className={`min-w-0 ${waiter ? 'text-left' : 'text-right'} break-all text-foreground ${row.mono ? 'font-mono text-[13px]' : ''} ${row.strong ? 'font-semibold tabular-nums' : ''}`}>
                                    {row.value}
                                </span>
                                {row.copy && (
                                    <button
                                        type="button"
                                        onClick={() => void copyText(row.copy![0], row.copy![1])}
                                        aria-label={`${row.label} kopyala`}
                                        title="Kopyala"
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <Copy className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
            <p className="text-xs text-muted-foreground">
                {tone === 'waiter'
                    ? 'Müşteri QR\'ı telefonuyla okutabilir. Havale hesaba geçince alttaki butona basın; ödeme IBAN olarak kaydedilir.'
                    : <>Havalenin hesaba geçtiğini kontrol ettikten sonra <strong>Ödemeyi Tamamla</strong>'ya basın; ödeme IBAN olarak kaydedilir, kasadaki nakde eklenmez.</>}
            </p>
        </PanelShell>
    );
}
