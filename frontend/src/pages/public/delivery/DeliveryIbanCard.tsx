import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Landmark, MessageCircle, Share2 } from 'lucide-react';
import { copyText, waNumber, type TableIbanPayment } from '@/features/customerSite/tableIbanPayment';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Props {
    payment: TableIbanPayment;
    /** Gönderilecek tutar (siparişin toplamı). */
    amount: number;
    /** Sipariş gönderildikten sonra bilinir; ödeme adımında null. */
    orderNumber: number | null;
    /** Kutunun zemini; sayfaya göre (ödeme adımı / takip sayfası). */
    className?: string;
}

type Copied = 'iban' | 'all' | null;

/** Havale açıklaması: "Sipariş 12" (bazı bankalar açıklamada "#" kabul etmez). */
function descriptionOf(orderNumber: number): string {
    return `Sipariş ${orderNumber}`;
}

function detailsText(payment: TableIbanPayment, amount: number, orderNumber: number | null): string {
    return [
        `Hesap sahibi: ${payment.accountHolder}`,
        `IBAN: ${payment.ibanFormatted}`,
        payment.bankName ? `Banka: ${payment.bankName}` : null,
        `Tutar: ${formatPrice(amount)} ₺`,
        orderNumber != null ? `Açıklama: ${descriptionOf(orderNumber)}` : null,
    ].filter(Boolean).join('\n');
}

function receiptUrl(phone: string, amount: number, orderNumber: number): string | null {
    const number = waNumber(phone);
    if (!number) return null;
    const text = `Merhaba, paket siparişim #${orderNumber} için ${formatPrice(amount)} ₺ ödemeyi IBAN ile yaptım. Dekontu ekliyorum.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

// Paket siparişte "IBAN ile öde" kutusu: ödeme adımında (sipariş numarası henüz yok) ve takip sayfasında (numara ve
// dekont için WhatsApp bağlantısı ile). Yalnızca bilgi verir; para restoranın hesabına geçince kasa siparişi kapatır.
// Renkler sitenin değişkenleridir (siteRootStyle), sitenin tüm tasarımlarında çalışır.
export default function DeliveryIbanCard({ payment, amount, orderNumber, className }: Props) {
    const [copied, setCopied] = useState<Copied>(null);
    const [failed, setFailed] = useState(false);
    const ibanRef = useRef<HTMLParagraphElement>(null);
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    useEffect(() => {
        if (!copied && !failed) return;
        const timer = setTimeout(() => { setCopied(null); setFailed(false); }, 2200);
        return () => clearTimeout(timer);
    }, [copied, failed]);

    const copy = async (kind: Exclude<Copied, null>) => {
        const text = kind === 'iban' ? payment.iban : detailsText(payment, amount, orderNumber);
        if (await copyText(text)) {
            setFailed(false);
            setCopied(kind);
            return;
        }
        // Kopyalanamadı: IBAN'ı seçili bırak, müşteri basılı tutup kopyalasın.
        const node = ibanRef.current;
        const selection = window.getSelection();
        if (node && selection) {
            const range = document.createRange();
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        setCopied(null);
        setFailed(true);
    };

    const share = async () => {
        try {
            await navigator.share({ title: 'IBAN bilgileri', text: detailsText(payment, amount, orderNumber) });
        } catch {
            /* müşteri paylaşımı kapattı ya da tarayıcı izin vermedi */
        }
    };

    const whatsapp = orderNumber != null && payment.whatsappPhone ? receiptUrl(payment.whatsappPhone, amount, orderNumber) : null;
    const button = 'flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-opacity hover:opacity-90';

    return (
        <section aria-label="IBAN ile ödeme bilgileri" className={cn('rounded-2xl border border-[var(--site-border-strong)] p-4', className)}>
            <div className="flex items-baseline justify-between gap-3">
                <p className="m-0 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--site-sub)]">
                    <Landmark className="h-3.5 w-3.5" aria-hidden="true" />Havale / EFT
                </p>
                <p className="m-0 text-right">
                    <span className="block text-xs text-[var(--site-sub)]">Gönderilecek tutar</span>
                    <span className="text-lg font-extrabold tabular-nums">{formatPrice(amount)} ₺</span>
                </p>
            </div>

            <p className="m-0 mt-3 text-xs font-semibold text-[var(--site-sub)]">IBAN</p>
            <p ref={ibanRef} className="m-0 mt-0.5 select-all break-words font-mono text-[15px] font-bold leading-snug min-[400px]:text-[17px] min-[400px]:tracking-wide">
                {payment.ibanFormatted}
            </p>
            <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
                <dt className="text-[var(--site-sub)]">Hesap sahibi</dt>
                <dd className="m-0 min-w-0 break-words font-semibold">{payment.accountHolder}</dd>
                {payment.bankName && (
                    <>
                        <dt className="text-[var(--site-sub)]">Banka</dt>
                        <dd className="m-0 min-w-0 break-words font-semibold">{payment.bankName}</dd>
                    </>
                )}
            </dl>

            <p className="m-0 mt-3 rounded-xl border-2 border-dashed border-[var(--site-border-strong)] px-3 py-2.5 text-sm leading-snug">
                {orderNumber != null
                    ? <>Açıklamaya sipariş numaranızı yazın: <b className="font-extrabold">{descriptionOf(orderNumber)}</b></>
                    : 'Siparişi gönderince sipariş numaranız gösterilecek; havalenin açıklamasına onu yazın. Bu bilgiler takip sayfasında da durur.'}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy('iban')}
                    className={cn(button, 'bg-[var(--site-paper)] text-[var(--site-on-paper)]')}>
                    {copied === 'iban' ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {copied === 'iban' ? 'Kopyalandı' : "IBAN'ı kopyala"}
                </button>
                <button type="button" onClick={() => void copy('all')} title="Hesap sahibi, IBAN, tutar ve açıklama"
                    className={cn(button, 'border border-[var(--site-border-strong)]')}>
                    {copied === 'all' ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {copied === 'all' ? 'Kopyalandı' : 'Bilgileri kopyala'}
                </button>
                {canShare && (
                    <button type="button" onClick={() => void share()}
                        className={cn(button, 'flex-none border border-[var(--site-border-strong)] px-4')}>
                        <Share2 className="h-4 w-4" aria-hidden="true" />Paylaş
                    </button>
                )}
            </div>
            <p aria-live="polite" role="status" className={cn('m-0 min-h-[1lh] pt-1.5 text-sm', failed ? 'font-semibold text-[var(--site-error)]' : 'text-[var(--site-sub)]')}>
                {failed ? "Kopyalanamadı. IBAN'ı basılı tutup kopyalayın." : copied === 'iban' ? 'IBAN kopyalandı.' : copied === 'all' ? 'Hesap bilgileri kopyalandı.' : ''}
            </p>

            {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noopener noreferrer"
                    className={cn(button, 'mt-1 w-full bg-[var(--site-accent)] text-[var(--site-on-accent)] no-underline')}>
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />Dekontu WhatsApp'tan gönder
                </a>
            )}
        </section>
    );
}
