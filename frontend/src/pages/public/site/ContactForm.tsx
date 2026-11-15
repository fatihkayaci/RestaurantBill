import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { CheckCircle2 } from 'lucide-react';
import { publicContactService } from '@/features/contactMessages/api/contactMessageService';
import {
    CONTACT_CONTACT_MAX, CONTACT_MESSAGE_MAX, CONTACT_MESSAGE_MIN, CONTACT_MESSAGE_TYPES, CONTACT_NAME_MAX, ContactMessageType,
} from '@/features/contactMessages/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { serif } from './siteParts';

// İletişim sayfasındaki "Bize yazın" formu: öneri, şikâyet ya da başka bir mesaj. Admin panelinde "Şikayet ve Öneriler"e düşer.
// Gizli "website" alanı bot tuzağıdır. Renkler sabit (site hep açık zeminde), uygulama koyu temadayken de aynı görünür.
const inputClass = 'h-12 w-full rounded-xl border border-[#DDD7CE] bg-[#FBFAF7] px-3.5 text-base text-[#141414] transition-colors placeholder:text-[#9A948B] hover:border-[#BDB5A8] focus:bg-white focus:border-[var(--site-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]/25';
const labelClass = 'mb-1.5 block text-sm font-semibold text-[#141414]';
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const alertClass = 'm-0 rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3.5 text-sm font-medium text-[var(--site-error)]';
const primaryButton = 'flex h-[52px] w-full items-center justify-center rounded-full bg-[var(--site-accent)] px-[30px] text-base font-bold text-[var(--site-on-accent)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto';

export default function ContactForm({ branchId }: { branchId: string }) {
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [type, setType] = useState<ContactMessageType>(ContactMessageType.Oneri);
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (sending) return;
        if (!name.trim()) { setError('Adınızı girin.'); return; }
        if (message.trim().length < CONTACT_MESSAGE_MIN) { setError(`Mesajınız en az ${CONTACT_MESSAGE_MIN} karakter olmalı.`); return; }

        setSending(true);
        setError(null);
        try {
            await publicContactService.submit({ branchId, name: name.trim(), contact: contact.trim(), type, message: message.trim(), website });
            setSent(true);
            setName('');
            setContact('');
            setMessage('');
            setType(ContactMessageType.Oneri);
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 429) setError('Çok sık deneme yapıldı. Birkaç dakika sonra tekrar deneyin.');
            else if (isAxiosError(err) && !err.response) setError('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
            else setError(getApiErrorMessage(err, 'Mesajınız gönderilemedi. Lütfen tekrar deneyin.'));
        } finally {
            setSending(false);
        }
    };

    if (sent) {
        return (
            <div role="status" className="flex flex-col items-start gap-4 rounded-[20px] border border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] p-6 text-[var(--site-ok)] md:p-8">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                <p className={cn(serif, 'm-0 text-[30px] leading-[1.1] text-[#141414] md:text-[36px]')}>Mesajınız bize ulaştı.</p>
                <p className="m-0 text-[15px] leading-relaxed text-[#3F3B36]">Teşekkür ederiz. Restoran ekibi mesajınızı okuyacak; iletişim bilgisi bıraktıysanız size dönüş yapılabilir.</p>
                <button type="button" onClick={() => setSent(false)} className={cn('h-11 rounded-full border border-[#141414] px-5 text-sm font-semibold text-[#141414] hover:bg-white/60', focusRing)}>
                    Yeni mesaj yaz
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="relative flex min-w-0 flex-col gap-3.5 md:gap-[18px]" aria-describedby={error ? 'ilt-form-hata' : undefined}>
            <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className={cn(labelClass, 'p-0')}>Mesaj türü</legend>
                <div className="flex flex-wrap gap-2">
                    {CONTACT_MESSAGE_TYPES.map(option => {
                        const on = type === option.value;
                        return (
                            <label
                                key={option.value}
                                className={cn(
                                    'flex h-11 cursor-pointer items-center rounded-full border px-[18px] text-sm font-semibold transition-colors md:px-5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--site-accent)] has-[:focus-visible]:ring-offset-2',
                                    on ? 'border-[#141414] bg-[#141414] text-white' : 'border-[#DDD7CE] bg-white text-[#141414] hover:border-[#141414]',
                                )}
                            >
                                <input type="radio" name="ilt-tur" value={option.value} checked={on} onChange={() => setType(option.value)} className="sr-only" />
                                {option.label}
                            </label>
                        );
                    })}
                </div>
            </fieldset>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="min-w-0">
                    <label htmlFor="ilt-ad" className={labelClass}>Adınız</label>
                    <input id="ilt-ad" value={name} onChange={e => setName(e.target.value)} required maxLength={CONTACT_NAME_MAX} autoComplete="name" placeholder="Adınız ve soyadınız" className={inputClass} />
                </div>
                <div className="min-w-0">
                    <label htmlFor="ilt-iletisim" className={labelClass}>Telefon ya da e-posta <span className="font-normal text-[#6F6A63]">(isteğe bağlı)</span></label>
                    <input id="ilt-iletisim" value={contact} onChange={e => setContact(e.target.value)} maxLength={CONTACT_CONTACT_MAX} autoComplete="email" placeholder="Size dönüş için" className={inputClass} />
                </div>
            </div>
            <div>
                <label htmlFor="ilt-mesaj" className={labelClass}>Mesajınız</label>
                <textarea
                    id="ilt-mesaj"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    minLength={CONTACT_MESSAGE_MIN}
                    maxLength={CONTACT_MESSAGE_MAX}
                    rows={5}
                    placeholder="Önerinizi, şikâyetinizi ya da sorunuzu yazın"
                    className={cn(inputClass, 'h-auto resize-y py-3 leading-relaxed')}
                />
                <p className="m-0 mt-1 text-right text-xs tabular-nums text-[#6F6A63]">{message.length} / {CONTACT_MESSAGE_MAX}</p>
            </div>
            {/* Bal küpü: ekranda ve okuyucuda görünmez, insan doldurmaz. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                    Web sitesi
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                </label>
            </div>
            {error && <p id="ilt-form-hata" role="alert" className={alertClass}>{error}</p>}
            <div className="flex flex-wrap items-center gap-4">
                <button type="submit" disabled={sending} className={cn(primaryButton, focusRing)}>
                    {sending ? 'Gönderiliyor…' : 'Gönder'}
                </button>
                <span className="hidden text-[13px] text-[#6F6A63] sm:inline">Mesajınızı yalnızca restoran görür.</span>
            </div>
        </form>
    );
}
