import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    RESERVATION_CODE_LENGTH, compactReservationCode, formatReservationCodeInput, formatTurkishPhoneInput,
} from '@/features/customerSite/reservationCode';
import { canReserveOnline } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { HeaderSpacer, SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, serif } from './site/siteParts';
import { telHref } from './site/siteTheme';
import { rememberReservationToken, restaurantName, useSite } from './site/useSite';

const NOT_FOUND = 'Bu bilgilerle bir rezervasyon bulunamadı.';
const TOO_MANY = 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';

const inputClass = 'h-14 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-card)] px-4 text-lg text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)] aria-[invalid=true]:border-[var(--site-error)]';
const labelClass = 'mb-1.5 block text-[15px] font-semibold';

// /rezervasyon-sorgula: bağlantısını kaybeden müşteri kısa kod ("K7M-2QP") ve rezervasyondaki telefonla rezervasyon
// sayfasına (/rezervasyon/:token) ulaşır; bağlantı bu cihazın listesine de eklenir. Kod ya da telefon yanlışsa
// hangisinin yanlış olduğu söylenmez.
export default function ReservationLookupPage() {
    const { site, error } = useSite();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const name = restaurantName(site);
    const phoneDigits = phone.replace(/\D/g, '').length;
    const ready = compactReservationCode(code).length === RESERVATION_CODE_LENGTH && phoneDigits >= 10;

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (sending) return;
        if (!ready) {
            setFormError('Rezervasyon kodunu (6 karakter) ve telefon numaranızı eksiksiz girin.');
            return;
        }
        setSending(true);
        setFormError(null);
        try {
            const { accessToken } = await publicService.lookupReservation(code, phone);
            rememberReservationToken(accessToken);
            navigate(`/rezervasyon/${accessToken}`);
        } catch (err) {
            setFormError(isAxiosError(err) && err.response?.status === 429 ? TOO_MANY : getApiErrorMessage(err, NOT_FOUND));
            setSending(false);
        }
    };

    return (
        <SitePage site={site} current="rezervasyon-sorgula">
            <section className="relative overflow-hidden bg-[#2A2622] text-white">
                {site.site.coverImageUrl && (
                    <>
                        <img src={site.site.coverImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
                        <div aria-hidden="true" className="absolute inset-0 bg-[rgba(20,16,12,0.6)]" />
                    </>
                )}
                <HeaderSpacer />
                <div className="relative mx-auto flex max-w-[1344px] flex-col gap-3 px-5 pb-10 pt-6 md:px-12 md:pb-14">
                    <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/80">{name}</span>
                    <h1 className={cn(serif, 'm-0 text-[48px] leading-[0.92] tracking-[-0.025em] md:text-[80px]')}>Rezervasyon <span className="italic">sorgula.</span></h1>
                </div>
            </section>

            <div className="flex-1 bg-[var(--site-bg)] font-[family-name:'Inter_Tight',system-ui,sans-serif] leading-normal text-[var(--site-text)]">
                <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
                    <p className="text-[15px] leading-relaxed text-[var(--site-sub)]">
                        Rezervasyon onay ekranında verilen kodu ve rezervasyonda yazdığınız telefon numarasını girin.
                    </p>

                    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="sorgu-kod" className={labelClass}>Rezervasyon kodu</label>
                            <input
                                id="sorgu-kod"
                                value={code}
                                onChange={e => { setCode(formatReservationCodeInput(e.target.value)); setFormError(null); }}
                                placeholder="K7M-2QP"
                                autoComplete="off"
                                autoCapitalize="characters"
                                autoCorrect="off"
                                spellCheck={false}
                                maxLength={RESERVATION_CODE_LENGTH + 1}
                                aria-describedby="sorgu-kod-ipucu"
                                aria-invalid={formError ? true : undefined}
                                className={cn(inputClass, 'font-mono text-2xl font-bold uppercase tracking-[0.18em] placeholder:font-normal placeholder:tracking-[0.12em]')}
                            />
                            <p id="sorgu-kod-ipucu" className="mt-1.5 text-[13px] text-[var(--site-muted)]">6 karakter; harfler ve rakamlar (0, O, 1, I, L kullanılmaz).</p>
                        </div>
                        <div>
                            <label htmlFor="sorgu-telefon" className={labelClass}>Telefon</label>
                            <input
                                id="sorgu-telefon"
                                type="tel"
                                inputMode="tel"
                                value={phone}
                                onChange={e => { setPhone(formatTurkishPhoneInput(e.target.value)); setFormError(null); }}
                                placeholder="05xx xxx xx xx"
                                autoComplete="tel"
                                maxLength={16}
                                aria-invalid={formError ? true : undefined}
                                className={cn(inputClass, 'tabular-nums')}
                            />
                        </div>

                        {formError && (
                            <p role="alert" className="rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3 text-sm font-medium text-[var(--site-error)]">
                                {formError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={sending}
                            className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--site-accent)] text-[17px] font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {sending ? 'Sorgulanıyor…' : 'Rezervasyonu bul'}
                        </button>
                    </form>

                    <div className="flex flex-col gap-2 border-t border-[var(--site-border)] pt-5 text-sm text-[var(--site-sub)]">
                        {site.phone && (
                            <p className="m-0">
                                Kodunuzu bulamıyor musunuz? Restoranı arayın: <a href={telHref(site.phone)} className="whitespace-nowrap font-semibold text-[var(--site-text)]">{site.phone}</a>
                            </p>
                        )}
                        {canReserveOnline(site) && (
                            <p className="m-0">
                                Rezervasyonunuz yok mu?{' '}
                                <Link to={RESERVATION_PATH} className="font-semibold text-[var(--site-accent)] underline-offset-4 hover:underline">Masa ayırtın</Link>
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </SitePage>
    );
}
