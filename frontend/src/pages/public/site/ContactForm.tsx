import { Link } from 'react-router-dom';
import {
    CONTACT_CONTACT_MAX, CONTACT_MESSAGE_MAX, CONTACT_MESSAGE_MIN, CONTACT_MESSAGE_TYPES, CONTACT_NAME_MAX,
} from '@/features/contactMessages/types';
import { cn } from '@/lib/utils';
import { serif } from './siteParts';
import { telHref } from './siteTheme';
import { terracottaBg } from './renkliTones';
import { useContactForm } from './useContactForm';

// İletişim sayfasındaki "Mesaj bırakın" formu (Renkli ve sıcak: krem kutuda kum alanlar, kiremit seçili konu, vurgu
// renginde gönder düğmesi): konu (mesaj türü: öneri, şikâyet, diğer), ad, telefon ya da
// e-posta (isteğe bağlı), mesaj ve KVKK onayı. Admin panelinde "Şikayet ve Öneriler"e düşer. Gizli "website" alanı bot
// tuzağıdır; sunucu da sık denemeyi sınırlar (429). Gönderilince "Mesajınız ulaştı." ve "Yeni mesaj yaz".

const field = 'w-full rounded-2xl border border-[rgba(36,24,15,0.15)] bg-[var(--site-bg)] px-[18px] text-base font-medium text-[var(--site-text)] transition-colors placeholder:font-normal placeholder:text-[var(--site-muted)] hover:border-[var(--site-border-strong)] focus:border-[var(--site-text)] focus:bg-[var(--site-card)] focus:outline-none focus:ring-2 focus:ring-[var(--site-text)]/15';
const labelClass = 'flex flex-col gap-2 text-[13px] font-extrabold';
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-text)] focus-visible:ring-offset-2';

export default function ContactForm({ branchId, phone }: { branchId: string; phone?: string }) {
    const {
        name, setName, contact, setContact, type, setType, message, setMessage, consent, setConsent, website, setWebsite,
        sending, error, sent, submit, reset,
    } = useContactForm(branchId);

    if (sent) {
        return (
            <div role="status" className="flex min-h-[420px] flex-col items-center justify-center gap-[18px] text-center md:min-h-[520px]">
                <span aria-hidden="true" className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent-text)]">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <h2 className={cn(serif, 'm-0 text-[44px] leading-none md:text-[52px]')}>Mesajınız <em className="rb-accent italic">ulaştı.</em></h2>
                <p className="m-0 max-w-[420px] text-base leading-relaxed text-[var(--site-sub)]">Teşekkür ederiz. Restoran ekibi mesajınızı okuyacak; iletişim bilgisi bıraktıysanız size dönüş yapılabilir.</p>
                <button type="button" onClick={reset} className={cn('h-[50px] rounded-full border border-[var(--site-border-strong)] px-6 font-bold text-[var(--site-text)] hover:border-[var(--site-text)]', focusRing)}>
                    Yeni mesaj yaz
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="relative flex min-w-0 flex-col gap-[22px]" aria-labelledby="ilt-form-baslik" aria-describedby={error ? 'ilt-form-hata' : undefined}>
            <div className="flex flex-col gap-1.5">
                <h2 id="ilt-form-baslik" className={cn(serif, 'm-0 text-[40px] leading-none md:text-[46px]')}>Mesaj bırakın</h2>
                <p className="m-0 text-sm text-[var(--site-muted)]">Mesajınızı doğrudan restoran ekibi okur. İletişim bilgisi bırakırsanız size dönüş yapılır.</p>
            </div>
            <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-2.5 p-0 text-[13px] font-extrabold">Konu</legend>
                <div className="flex flex-wrap gap-2">
                    {CONTACT_MESSAGE_TYPES.map(option => {
                        const on = type === option.value;
                        return (
                            <label key={option.value}
                                className={cn('flex h-11 cursor-pointer items-center rounded-full border px-[18px] text-sm font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--site-text)] has-[:focus-visible]:ring-offset-2',
                                    on ? cn('border-[var(--site-terracotta)] text-[var(--site-on-terracotta)]', terracottaBg) : 'border-[rgba(36,24,15,0.18)] text-[var(--site-text)] hover:border-[var(--site-text)]')}>
                                <input type="radio" name="ilt-tur" value={option.value} checked={on} onChange={() => setType(option.value)} className="sr-only" />
                                {option.label}
                            </label>
                        );
                    })}
                </div>
            </fieldset>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3.5">
                <label className={labelClass}>Adınız
                    <input value={name} onChange={e => setName(e.target.value)} required maxLength={CONTACT_NAME_MAX} autoComplete="name" placeholder="Ad Soyad" className={cn(field, 'h-14')} />
                </label>
                <label className={labelClass}>
                    <span>Telefon ya da e-posta <span className="font-medium text-[var(--site-muted)]">(isteğe bağlı)</span></span>
                    <input value={contact} onChange={e => setContact(e.target.value)} maxLength={CONTACT_CONTACT_MAX} autoComplete="tel" placeholder="Size dönüş için" className={cn(field, 'h-14')} />
                </label>
            </div>
            <label className={labelClass}>Mesajınız
                <textarea value={message} onChange={e => setMessage(e.target.value)} required minLength={CONTACT_MESSAGE_MIN} maxLength={CONTACT_MESSAGE_MAX} rows={5}
                    placeholder="Önerinizi, şikâyetinizi ya da sorunuzu yazın" className={cn(field, 'resize-y py-4 leading-relaxed')} />
                <span className="text-right text-xs font-medium tabular-nums text-[var(--site-muted)]">{message.length} / {CONTACT_MESSAGE_MAX}</span>
            </label>
            {/* Bal küpü: ekranda ve okuyucuda görünmez, insan doldurmaz. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                    Web sitesi
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                </label>
            </div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px] leading-normal text-[var(--site-sub)]">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required
                    className="m-0 mt-0.5 h-5 w-5 shrink-0 accent-[var(--site-paper)]" />
                <span>
                    <Link to="/gizlilik-politikasi" target="_blank" className="font-bold text-[var(--site-text)] underline underline-offset-2">KVKK aydınlatma metnini</Link> okudum;
                    bana bu konu hakkında dönüş yapılmasını kabul ediyorum.
                </span>
            </label>
            {error && <p id="ilt-form-hata" role="alert" className="m-0 rounded-2xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3.5 text-sm font-semibold text-[var(--site-error)]">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="submit" disabled={sending}
                    className={cn('h-[58px] w-full rounded-full bg-[var(--site-accent)] px-8 text-base font-extrabold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto', focusRing)}>
                    {sending ? 'Gönderiliyor…' : 'Mesajı gönder'}
                </button>
                {phone && (
                    <span className="text-[13px] text-[var(--site-muted)]">Acil mi? <a href={telHref(phone)} className="inline-flex min-h-11 items-center font-extrabold text-[var(--site-text)] underline-offset-2 hover:underline">Hemen arayın</a></span>
                )}
            </div>
        </form>
    );
}
