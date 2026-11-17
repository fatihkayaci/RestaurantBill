import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Landmark, MessageCircle, Phone, X } from 'lucide-react';
import { copyText, receiptWhatsappUrl, telLink, type TableIbanPayment } from '@/features/customerSite/tableIbanPayment';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { serif } from '../site/siteParts';
import { closeCircle, eyebrowAccent, pillAccent, pillDark, sheetBackdrop, sheetPanel } from '../table/tableUi';

interface Props {
    payment: TableIbanPayment;
    tableName: string;
    /** "Hesap iste"den bilinen masa toplamı; bilinmiyorsa null (tutar satırı gizli). */
    amount: number | null;
    onClose: () => void;
}

// "IBAN ile öde" penceresi: yalnızca bilgi verir, hiçbir istek göndermez ve hesabı değiştirmez. Misafir IBAN'ı kopyalar,
// bankasından ödemeyi yapar, dekontu WhatsApp'tan restorana gönderir; restoran parayı görünce kasadan kapatır.
export default function IbanPaySheet({ payment, tableName, amount, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const ibanRef = useRef<HTMLParagraphElement>(null);
    const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => { ref.current?.focus(); }, []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 2200);
        return () => clearTimeout(timer);
    }, [toast]);

    const copy = async (text: string, label: string) => {
        if (await copyText(text)) {
            setToast({ text: `${label} kopyalandı`, ok: true });
            return;
        }
        // Kopyalanamadı: IBAN'ı seçili bırak, misafir basılı tutup kopyalasın.
        const node = ibanRef.current;
        const selection = window.getSelection();
        if (node && selection) {
            const range = document.createRange();
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        setToast({ text: 'Kopyalanamadı. IBAN\'ı basılı tutup kopyalayın.', ok: false });
    };

    const known = amount != null && amount > 0 ? amount : null;
    const whatsappUrl = payment.whatsappPhone ? receiptWhatsappUrl(payment.whatsappPhone, tableName, known) : null;

    return (
        <div className={sheetBackdrop} onClick={onClose}>
            <div
                ref={ref}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="iban-ode-baslik"
                onClick={e => e.stopPropagation()}
                className={cn(sheetPanel, 'relative')}
            >
                <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-6">
                    <div className="min-w-0">
                        <p className={cn(eyebrowAccent, 'm-0')}>Havale / EFT</p>
                        <h2 id="iban-ode-baslik" className={cn(serif, 'm-0 mt-1 text-[34px] leading-none')}>IBAN ile öde</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="IBAN ile ödemeyi kapat" className={closeCircle}>
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
                    {known != null && (
                        <div className="flex items-baseline justify-between gap-3 rounded-[20px] bg-[var(--site-paper)] px-5 py-4 text-[var(--site-on-paper)]">
                            <span className="min-w-0">
                                <span className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-on-paper-sub)]">Ödenecek tutar</span>
                                <span className="mt-0.5 block text-[13px] text-[var(--site-on-paper-sub)]">Hesap istendiğindeki masa toplamı</span>
                            </span>
                            <span className={cn(serif, 'shrink-0 text-[30px] leading-none tabular-nums')}>{formatPrice(known)} ₺</span>
                        </div>
                    )}

                    {/* Hesap: IBAN (kopyala), hesap sahibi, banka. */}
                    <section aria-label="Hesap bilgileri" className="rounded-[20px] bg-[var(--site-bg)] p-4">
                        <p className="m-0 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--site-sub)]">
                            <Landmark className="h-3.5 w-3.5" aria-hidden="true" />IBAN
                        </p>
                        <p ref={ibanRef} className="m-0 mt-1.5 select-all break-words font-mono text-[15px] font-bold leading-snug min-[400px]:text-[17px] min-[400px]:tracking-wide text-[var(--site-text)]">
                            {payment.ibanFormatted}
                        </p>
                        <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
                            <dt className="text-[var(--site-sub)]">Hesap sahibi</dt>
                            <dd className="m-0 min-w-0 break-words font-bold">{payment.accountHolder}</dd>
                            {payment.bankName && (
                                <>
                                    <dt className="text-[var(--site-sub)]">Banka</dt>
                                    <dd className="m-0 min-w-0 break-words font-bold">{payment.bankName}</dd>
                                </>
                            )}
                        </dl>
                        <button type="button" onClick={() => void copy(payment.iban, 'IBAN')} className={cn(pillDark, 'mt-4 h-12 w-full text-[15px]')}>
                            <Copy className="h-4 w-4" aria-hidden="true" />IBAN'ı kopyala
                        </button>
                    </section>

                    <p className="m-0 rounded-[20px] border-2 border-dashed border-[var(--site-border-strong)] px-4 py-3 text-[15px] leading-snug">
                        Açıklamaya masa adını yazın: <b className="font-extrabold">{tableName}</b>
                    </p>

                    {/* Dekont: WhatsApp (varsa) ve numara + Ara. */}
                    <section aria-labelledby="iban-dekont" className="rounded-[20px] bg-[var(--site-bg)] p-4">
                        <h3 id="iban-dekont" className={cn(serif, 'm-0 text-[21px] leading-tight')}>Dekontu gönderin</h3>
                        <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--site-sub)]">
                            {whatsappUrl
                                ? 'Ödemeden sonra dekontu WhatsApp\'tan ekleyin; restoran ödemeyi görünce hesabınızı kapatır.'
                                : 'Ödemeden sonra dekontu garsona gösterin; restoran ödemeyi görünce hesabınızı kapatır.'}
                        </p>
                        {whatsappUrl && (
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={cn(pillAccent, 'mt-3 h-12 w-full text-[15px]')}>
                                <MessageCircle className="h-4 w-4" aria-hidden="true" />Dekontu WhatsApp'tan gönder
                            </a>
                        )}
                        {payment.phone && (
                            <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="min-w-0 truncate text-[15px] font-bold tabular-nums">{payment.phone}</span>
                                <a href={telLink(payment.phone)} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--site-border-strong)] px-4 text-[15px] font-bold text-[var(--site-text)] no-underline hover:border-[var(--site-text)]">
                                    <Phone className="h-4 w-4" aria-hidden="true" />Ara
                                </a>
                            </div>
                        )}
                    </section>
                </div>

                <div aria-live="polite" className="pointer-events-none absolute inset-x-0 top-[92px] flex justify-center px-4">
                    {toast && (
                        <span role="status" className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold shadow-[0_12px_30px_-10px_rgba(36,24,15,0.5)]',
                            toast.ok ? 'bg-[var(--site-paper)] text-[var(--site-on-paper)]' : 'bg-[var(--site-error-bg)] text-[var(--site-error)]')}>
                            {toast.ok && <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}{toast.text}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
