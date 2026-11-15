import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarPlus, CircleAlert, Phone, Search } from 'lucide-react';
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

const inputClass = 'h-14 w-full rounded-xl border border-[#DDD7CE] bg-white px-4 text-lg text-[#141414] transition-colors placeholder:text-[#9A948B] hover:border-[#BDB5A8] focus:border-[var(--site-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]/25 aria-[invalid=true]:border-[var(--site-error)] aria-[invalid=true]:ring-[var(--site-error)]/15';
const helpCard = 'flex items-center gap-3.5 rounded-[18px] border border-[#DDD7CE] bg-white p-4 text-[#141414] no-underline transition-colors hover:border-[#141414]';
const labelClass = 'mb-1.5 block text-sm font-medium text-[#141414]';

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
    const codeLength = compactReservationCode(code).length;
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
                <div className="relative mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-5 pb-24 pt-8 md:px-12 md:pb-32 md:pt-14">
                    <span className="text-xs font-medium uppercase tracking-[0.28em] text-white/80">{name} · Rezervasyon</span>
                    <h1 className={cn(serif, 'm-0 text-[48px] leading-[0.92] tracking-[-0.025em] md:text-[88px]')}>Rezervasyon <span className="italic">sorgula.</span></h1>
                    <p className="m-0 mt-1 max-w-[46ch] text-[15px] leading-relaxed text-white/85 md:text-[17px]">
                        Bağlantınızı mı kaybettiniz? Kodunuz ve telefon numaranızla rezervasyonunuza ulaşın.
                    </p>
                </div>
            </section>

            <div className="flex flex-1 flex-col bg-[#F5F2ED] leading-normal text-[#141414]">
                <main className="relative mx-auto -mt-16 flex w-full max-w-[560px] flex-col gap-5 px-4 pb-16 sm:px-5 md:-mt-20">
                    <div className="rounded-[22px] border border-[#DDD7CE] bg-white p-5 shadow-[0_24px_48px_-28px_rgba(20,16,12,0.45)] sm:p-8">
                        <div className="mb-6 flex items-start gap-4">
                            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F2ED] text-[#141414]">
                                <Search className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <h2 className={cn(serif, 'm-0 text-[30px] leading-[1.05] tracking-[-0.01em] sm:text-[34px]')}>Rezervasyonunuzu bulun</h2>
                                <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-[#4A4640]">
                                    Rezervasyon onay ekranında verilen kodu ve rezervasyonda yazdığınız telefon numarasını girin.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
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
                                    className={cn(inputClass, 'h-16 text-center font-mono text-[28px] font-bold uppercase tracking-[0.22em] placeholder:font-normal placeholder:tracking-[0.18em] placeholder:text-[#CFC8BC]')}
                                />
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p id="sorgu-kod-ipucu" className="m-0 text-[13px] text-[#6F6A63]">6 karakter; harfler ve rakamlar (0, O, 1, I, L kullanılmaz).</p>
                                    <span aria-hidden="true" className={cn('shrink-0 text-xs font-medium tabular-nums', codeLength === RESERVATION_CODE_LENGTH ? 'text-[var(--site-ok)]' : 'text-[#9A948B]')}>
                                        {codeLength}/{RESERVATION_CODE_LENGTH}
                                    </span>
                                </div>
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
                                <p role="alert" className="m-0 flex items-start gap-2.5 rounded-xl border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3.5 text-sm font-medium text-[var(--site-error)]">
                                    <CircleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                                    {formError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={sending}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--site-accent)] text-base font-semibold text-[var(--site-on-accent)] transition-[opacity,transform] hover:-translate-y-px hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 motion-reduce:transition-none"
                            >
                                {sending ? (
                                    <>
                                        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                                        Sorgulanıyor…
                                    </>
                                ) : (
                                    <>
                                        Rezervasyonu bul
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {(site.phone || canReserveOnline(site)) && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {site.phone && (
                                <a href={telHref(site.phone)} className={cn(helpCard, !canReserveOnline(site) && 'sm:col-span-2')}>
                                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F2ED]"><Phone className="h-4 w-4" /></span>
                                    <span className="min-w-0">
                                        <span className="block text-[13px] text-[#6F6A63]">Kodunuzu bulamıyor musunuz? Arayın</span>
                                        <span className="block whitespace-nowrap font-semibold tabular-nums">{site.phone}</span>
                                    </span>
                                </a>
                            )}
                            {canReserveOnline(site) && (
                                <Link to={RESERVATION_PATH} className={cn(helpCard, !site.phone && 'sm:col-span-2')}>
                                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F2ED]"><CalendarPlus className="h-4 w-4" /></span>
                                    <span className="min-w-0">
                                        <span className="block text-[13px] text-[#6F6A63]">Rezervasyonunuz yok mu?</span>
                                        <span className="block font-semibold text-[var(--site-accent)]">Masa ayırtın →</span>
                                    </span>
                                </Link>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </SitePage>
    );
}
