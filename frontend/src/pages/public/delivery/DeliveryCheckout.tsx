import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Banknote, CreditCard, Landmark } from 'lucide-react';
import { publicDeliveryService } from '@/features/delivery/api/publicDeliveryService';
import { formatPhoneInput, isCompletePhone, toCartInput, type DeliveryCartLine } from '@/features/delivery/deliveryCart';
import {
    DoorPayment, type DeliveryQuote, type DeliveryZone, type DoorPaymentMethod, type OnlineOrdering, type SubmittedDeliveryOrder,
} from '@/features/delivery/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { headingFont } from '../site/siteTheme';
import DeliveryIbanCard from './DeliveryIbanCard';
import Sheet from './Sheet';

interface Props {
    data: OnlineOrdering;
    zone: DeliveryZone;
    lines: DeliveryCartLine[];
    quote: DeliveryQuote;
    /** Sepet başına bir kez üretilir; yeniden denemede aynısı gider (sunucu aynı siparişi döndürür). */
    clientRequestId: string;
    onQuoteChanged: (quote: DeliveryQuote) => void;
    onSubmitted: (result: SubmittedDeliveryOrder) => void;
    onClose: () => void;
}

const fieldClass = 'w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]';

interface SubmitProblem {
    message: string;
    /** Bağlantı koptu: sipariş gitmiş olabilir, aynı anahtarla tekrar göndermek güvenli. */
    retry: boolean;
}

// Paket siparişin son adımı: ad, telefon (0xxx xxx xx xx), adres, tarif, not, ödeme (kapıda nakit/kart ya da IBAN ile
// havale) ve gerekiyorsa SMS kodu. IBAN seçilince hesap bilgileri ve tutar kopyalanabilir kutuda gösterilir.
// Gizli "website" alanı bot tuzağıdır. Fiyat değiştiyse (409) yeni toplam gösterilir, müşteri onaylayıp yeniden gönderir.
export default function DeliveryCheckout({ data, zone, lines, quote, clientRequestId, onQuoteChanged, onSubmitted, onClose }: Props) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [directions, setDirections] = useState('');
    const [note, setNote] = useState('');
    // Tek yöntem varsa seçili gelir; IBAN tek yöntemse bilgileri de gelmiş olmalı.
    const [payment, setPayment] = useState<DoorPaymentMethod | null>(
        data.paymentMethods.length === 1 && (data.paymentMethods[0] !== DoorPayment.Iban || !!data.ibanPayment) ? data.paymentMethods[0] : null);
    const [website, setWebsite] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [problem, setProblem] = useState<SubmitProblem | null>(null);
    const [touched, setTouched] = useState(false);

    // SMS doğrulaması (yalnızca restoran istiyorsa ve SMS sağlayıcısı bağlıysa).
    const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [resendAt, setResendAt] = useState(0);
    const [verification, setVerification] = useState<{ phone: string; token: string } | null>(null);
    const [otpBusy, setOtpBusy] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (resendAt <= Date.now()) return;
        const timer = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= resendAt) clearInterval(timer);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendAt]);

    const phoneOk = isCompletePhone(phone);
    const verified = !data.requiresPhoneVerification || (verification !== null && verification.phone === phone);
    const errors = {
        name: !name.trim() ? 'Adınızı ve soyadınızı yazın.' : null,
        phone: !phoneOk ? 'Telefon numaranızı 0xxx xxx xx xx biçiminde yazın.' : null,
        address: !address.trim() ? 'Açık adresinizi yazın.' : null,
        payment: payment === null ? 'Ödeme yöntemini seçin.' : null,
    };
    const valid = !Object.values(errors).some(Boolean) && verified;
    // IBAN listede olsa da bilgileri gelmediyse seçenek gösterilmez (sunucu ikisini birlikte gönderir).
    const methods = data.paymentMethods.filter(m => m !== DoorPayment.Iban || !!data.ibanPayment);
    const byIban = payment === DoorPayment.Iban && !!data.ibanPayment;
    const onlyDoor = methods.every(m => m !== DoorPayment.Iban);

    const sendCode = async () => {
        if (!phoneOk) return;
        setOtpBusy(true);
        setOtpError(null);
        try {
            const sent = await publicDeliveryService.sendPhoneCode(data.branchId, phone);
            setCodeSentTo(phone);
            setCode('');
            setResendAt(Date.now() + sent.resendAfterSeconds * 1000);
            setNow(Date.now());
        } catch (err) {
            setOtpError(getApiErrorMessage(err, 'Kod gönderilemedi. Biraz sonra tekrar deneyin.'));
        } finally {
            setOtpBusy(false);
        }
    };

    const verifyCode = async () => {
        if (!codeSentTo || !code.trim()) return;
        setOtpBusy(true);
        setOtpError(null);
        try {
            const result = await publicDeliveryService.verifyPhone(data.branchId, codeSentTo, code.trim());
            setVerification({ phone: codeSentTo, token: result.verificationToken });
        } catch (err) {
            setOtpError(getApiErrorMessage(err, 'Kod doğrulanamadı.'));
        } finally {
            setOtpBusy(false);
        }
    };

    const submit = async () => {
        setTouched(true);
        if (!valid || submitting || payment === null) return;
        setSubmitting(true);
        setProblem(null);
        try {
            const result = await publicDeliveryService.submit({
                branchId: data.branchId,
                clientRequestId,
                zoneId: zone.id,
                lines: toCartInput(lines),
                customerName: name.trim(),
                phone,
                address: address.trim(),
                addressDirections: directions.trim() || undefined,
                note: note.trim() || undefined,
                paymentMethod: payment,
                expectedTotal: quote.total,
                website,
                verificationToken: verification?.token,
            });
            onSubmitted(result);
        } catch (err) {
            if (isAxiosError<{ error?: string; quote?: DeliveryQuote }>(err) && err.response?.status === 409 && err.response.data?.quote) {
                const fresh = err.response.data.quote;
                onQuoteChanged(fresh);
                setProblem({ message: `Fiyatlar güncellendi. Yeni toplam ${formatPrice(fresh.total)} ₺. Kontrol edip yeniden gönderin.`, retry: false });
            } else if (isAxiosError(err) && err.response?.status === 429) {
                setProblem({ message: 'Çok sık deneme yapıldı. Birkaç dakika sonra tekrar deneyin ya da restoranı arayın.', retry: false });
            } else if (isAxiosError(err) && !err.response) {
                setProblem({ message: 'Bağlantı koptu, siparişiniz ulaşmamış olabilir. Tekrar göndermek güvenli: aynı sipariş iki kez açılmaz.', retry: true });
            } else {
                setProblem({ message: getApiErrorMessage(err, 'Sipariş gönderilemedi. Lütfen tekrar deneyin.'), retry: false });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const showError = (key: keyof typeof errors) => touched && errors[key]
        ? <p className="mt-1 text-sm text-[var(--site-error)]">{errors[key]}</p>
        : null;

    const footer = (
        <>
            {problem && (
                <p role="alert" className="mb-3 rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3 text-sm font-medium text-[var(--site-error)]">
                    {problem.message}
                    {data.restaurantPhone && !problem.retry && <> Restoran: <a className="underline" href={`tel:${data.restaurantPhone.replace(/[^\d+]/g, '')}`}>{data.restaurantPhone}</a></>}
                </p>
            )}
            <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex h-14 w-full items-center justify-between rounded-full bg-[var(--site-accent)] px-6 text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                <span className="text-base font-semibold">{submitting ? 'Gönderiliyor…' : problem?.retry ? 'Tekrar gönder' : 'Siparişi gönder'}</span>
                <span className={cn(headingFont, 'text-lg font-bold tabular-nums')}>{formatPrice(quote.total)} ₺</span>
            </button>
            <p className="mt-2 text-center text-xs text-[var(--site-muted)]">
                {byIban
                    ? 'Restoran onaylayınca hazırlanır. IBAN bilgileri ve sipariş numaranız takip sayfasında da görünür.'
                    : 'Restoran onaylayınca hazırlanır. Ödeme kapıda yapılır.'}
            </p>
        </>
    );

    return (
        <Sheet title="Teslimat bilgileri" onClose={onClose} locked={submitting} footer={footer}>
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
                <p className="rounded-2xl bg-[var(--site-raised)] px-4 py-3 text-sm">
                    <span className="font-semibold">{zone.name}</span> · teslimat {formatPrice(quote.deliveryFee)} ₺ · yaklaşık {quote.estimatedMinutes || zone.estimatedMinutes} dk
                </p>

                <label className="block">
                    <span className="text-sm font-semibold">Ad soyad</span>
                    <input value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" className={cn(fieldClass, 'mt-1.5 h-12')} />
                    {showError('name')}
                </label>

                <label className="block">
                    <span className="text-sm font-semibold">Telefon</span>
                    <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={e => setPhone(formatPhoneInput(e.target.value))}
                        placeholder="05xx xxx xx xx"
                        className={cn(fieldClass, 'mt-1.5 h-12 tabular-nums')}
                    />
                    {showError('phone')}
                </label>

                {data.requiresPhoneVerification && (
                    <div className="rounded-2xl border border-[var(--site-border-strong)] p-4">
                        {verified ? (
                            <p className="text-sm font-semibold text-[var(--site-ok)]">Telefon numaranız doğrulandı.</p>
                        ) : (
                            <>
                                <p className="text-sm">Siparişi göndermek için telefonunuza gelen kodu girin.</p>
                                {codeSentTo === phone && phoneOk ? (
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            value={code}
                                            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            placeholder="Kod"
                                            aria-label="Doğrulama kodu"
                                            className={cn(fieldClass, 'h-12 flex-1 tracking-[0.3em] tabular-nums')}
                                        />
                                        <button type="button" onClick={verifyCode} disabled={otpBusy || code.length < 4}
                                            className="h-12 rounded-full bg-[var(--site-paper)] px-5 text-sm font-semibold text-[var(--site-on-paper)] disabled:opacity-50">
                                            Doğrula
                                        </button>
                                    </div>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={sendCode}
                                    disabled={!phoneOk || otpBusy || (codeSentTo === phone && resendAt > now)}
                                    className="mt-3 h-11 rounded-full border border-[var(--site-border-strong)] px-4 text-sm font-semibold disabled:opacity-50"
                                >
                                    {codeSentTo === phone
                                        ? resendAt > now ? `Yeni kod ${Math.ceil((resendAt - now) / 1000)} sn sonra` : 'Yeni kod gönder'
                                        : 'Kod gönder'}
                                </button>
                                {otpError && <p className="mt-2 text-sm text-[var(--site-error)]">{otpError}</p>}
                                {touched && !verified && <p className="mt-2 text-sm text-[var(--site-error)]">Telefon numaranızı doğrulayın.</p>}
                            </>
                        )}
                    </div>
                )}

                <label className="block">
                    <span className="text-sm font-semibold">Açık adres</span>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} maxLength={400} rows={3} autoComplete="street-address"
                        placeholder="Mahalle, sokak, bina no, kat, daire" className={cn(fieldClass, 'mt-1.5 py-2.5')} />
                    {showError('address')}
                </label>

                <label className="block">
                    <span className="text-sm font-semibold">Adres tarifi <span className="font-normal text-[var(--site-sub)]">(isteğe bağlı)</span></span>
                    <input value={directions} onChange={e => setDirections(e.target.value)} maxLength={300} placeholder="ör. eczanenin üstü, zil çalışmıyor"
                        className={cn(fieldClass, 'mt-1.5 h-12')} />
                </label>

                <label className="block">
                    <span className="text-sm font-semibold">Sipariş notu <span className="font-normal text-[var(--site-sub)]">(isteğe bağlı)</span></span>
                    <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2} className={cn(fieldClass, 'mt-1.5 py-2.5')} />
                </label>

                <fieldset>
                    <legend className="text-sm font-semibold">{onlyDoor ? 'Kapıda ödeme' : 'Ödeme'}</legend>
                    <div role="radiogroup" aria-label="Ödeme yöntemi" className="mt-1.5 grid grid-cols-2 gap-2">
                        {methods.map((method, index) => {
                            const checked = payment === method;
                            const Icon = method === DoorPayment.Nakit ? Banknote : method === DoorPayment.Iban ? Landmark : CreditCard;
                            const label = method === DoorPayment.Nakit ? 'Kapıda nakit' : method === DoorPayment.Iban ? 'IBAN ile öde' : 'Kapıda kart';
                            return (
                                <button
                                    key={method}
                                    type="button"
                                    role="radio"
                                    aria-checked={checked}
                                    onClick={() => setPayment(method)}
                                    className={cn(
                                        'flex min-h-14 items-center justify-center gap-2 rounded-2xl border text-[15px] font-semibold transition-colors',
                                        // Tek sayıda seçenekte sonuncusu tam satır.
                                        methods.length % 2 === 1 && index === methods.length - 1 && 'col-span-2',
                                        checked ? 'border-[var(--site-paper)] bg-[var(--site-paper)] text-[var(--site-on-paper)]' : 'border-[var(--site-border-strong)]'
                                    )}
                                >
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                    {showError('payment')}
                    {byIban && data.ibanPayment && (
                        <DeliveryIbanCard payment={data.ibanPayment} amount={quote.total} orderNumber={null} className="mt-3 bg-[var(--site-raised)]" />
                    )}
                </fieldset>

                {/* Bal küpü: ekranda ve ekran okuyucuda yok; yalnızca botlar doldurur. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label>
                        Web sitesi
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                    </label>
                </div>
            </form>
        </Sheet>
    );
}
