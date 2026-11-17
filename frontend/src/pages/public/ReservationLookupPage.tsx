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
import { PageHero, SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, serif } from './site/siteParts';
import { telHref } from './site/siteTheme';
import { rememberReservationToken, restaurantName, useMyReservations, useSite } from './site/useSite';
import { dateParts, reservationStatusBadge } from './reservationCalendar';
import type { ReservationStatusInfo } from '@/features/customerSite/types';

const NOT_FOUND = 'Bu bilgilerle bir rezervasyon bulunamadı.';
const TOO_MANY = 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';

const inputClass = 'h-14 w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-card)] px-4 text-lg text-[var(--site-text)] transition-colors placeholder:text-[var(--site-muted)] hover:border-[var(--site-border-strong)] focus:border-[var(--site-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]/25 aria-[invalid=true]:border-[var(--site-error)] aria-[invalid=true]:ring-[var(--site-error)]/15';
const helpCard = 'flex items-center gap-3.5 rounded-[18px] border border-[var(--site-border)] bg-[var(--site-card)] p-4 text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-text)]';
const labelClass = 'mb-1.5 block text-sm font-medium text-[var(--site-text)]';

// /rezervasyon-sorgula: bağlantısını kaybeden müşteri kısa kod ("K7M-2QP") ve rezervasyondaki telefonla rezervasyon
// sayfasına (/rezervasyon/:token) ulaşır; bağlantı bu cihazın listesine de eklenir. Kod ya da telefon yanlışsa
// hangisinin yanlış olduğu söylenmez.
export default function ReservationLookupPage() {
    const { site, error } = useSite();
    // Bu cihazdan gönderilmiş ya da açılmış rezervasyonlar: çoğu misafir kod yazmadan buradan ulaşır.
    const { mine } = useMyReservations();
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
            <PageHero site={site} label={`${name} · Rezervasyon`} compact title="Rezervasyon sorgula.">
                <p className="m-0 max-w-[46ch] text-base leading-relaxed text-[var(--site-sub)] md:text-[17px]">
                    Bağlantınızı mı kaybettiniz? Kodunuz ve telefon numaranızla rezervasyonunuza ulaşın.
                </p>
            </PageHero>

            <div className="flex flex-1 flex-col bg-[var(--site-bg)] leading-normal text-[var(--site-text)]">
                <main className="relative mx-auto flex w-full max-w-[560px] flex-col gap-5 px-4 pb-16 pt-10 sm:px-5 md:pt-14">
                    {mine.length > 0 && <SavedReservations items={mine} />}

                    <div className={cn('rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] p-5 sm:p-8', mine.length === 0 && 'shadow-[0_24px_48px_-28px_rgba(20,16,12,0.45)]')}>
                        {mine.length > 0 ? (
                            <div className="mb-5">
                                <h2 className={cn(serif, 'm-0 text-[28px] leading-[1.05] tracking-[-0.01em]')}>ya da <span className="italic">kodla bulun.</span></h2>
                                <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--site-sub)]">Listede olmayan bir rezervasyon için kodu ve telefon numarasını girin.</p>
                            </div>
                        ) : (
                            <div className="mb-6 flex items-start gap-4">
                                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)] text-[var(--site-text)]">
                                    <Search className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className={cn(serif, 'm-0 text-[30px] leading-[1.05] tracking-[-0.01em] sm:text-[34px]')}>Rezervasyonunuzu bulun</h2>
                                    <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-[var(--site-sub)]">
                                        Rezervasyon onay ekranında verilen kodu ve rezervasyonda yazdığınız telefon numarasını girin.
                                    </p>
                                </div>
                            </div>
                        )}

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
                                    className={cn(inputClass, 'h-16 text-center font-mono text-[28px] font-bold uppercase tracking-[0.22em] placeholder:font-normal placeholder:tracking-[0.18em] placeholder:text-[var(--site-muted)]')}
                                />
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p id="sorgu-kod-ipucu" className="m-0 text-[13px] text-[var(--site-sub)]">6 karakter; harfler ve rakamlar (0, O, 1, I, L kullanılmaz).</p>
                                    <span aria-hidden="true" className={cn('shrink-0 text-xs font-medium tabular-nums', codeLength === RESERVATION_CODE_LENGTH ? 'text-[var(--site-ok)]' : 'text-[var(--site-muted)]')}>
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

                    {formError && formError !== TOO_MANY && <CodeHelp restaurant={name} />}

                    {(site.phone || canReserveOnline(site)) && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {site.phone && (
                                <a href={telHref(site.phone)} className={cn(helpCard, !canReserveOnline(site) && 'sm:col-span-2')}>
                                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)]"><Phone className="h-4 w-4" /></span>
                                    <span className="min-w-0">
                                        <span className="block text-[13px] text-[var(--site-sub)]">Kodunuzu bulamıyor musunuz? Arayın</span>
                                        <span className="block whitespace-nowrap font-semibold tabular-nums">{site.phone}</span>
                                    </span>
                                </a>
                            )}
                            {canReserveOnline(site) && (
                                <Link to={RESERVATION_PATH} className={cn(helpCard, !site.phone && 'sm:col-span-2')}>
                                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-bg)]"><CalendarPlus className="h-4 w-4" /></span>
                                    <span className="min-w-0">
                                        <span className="block text-[13px] text-[var(--site-sub)]">Rezervasyonunuz yok mu?</span>
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

// Bu cihazdaki rezervasyonlar: tarih kutusu, durum, saat · kişi · masa ve kod; dokununca rezervasyon sayfası açılır.
function SavedReservations({ items }: { items: ReservationStatusInfo[] }) {
    return (
        <section aria-labelledby="sorgu-benim" className="rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] p-5 shadow-[0_24px_48px_-28px_rgba(20,16,12,0.45)] sm:p-6">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--site-sub)]">Bu cihazda</span>
            <h2 id="sorgu-benim" className={cn(serif, 'm-0 mt-1 text-[30px] leading-[1.05] tracking-[-0.01em] sm:text-[34px]')}>Rezervasyon<span className="italic">larınız.</span></h2>
            <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
                {items.map(item => {
                    const parts = dateParts(item.date);
                    const badge = reservationStatusBadge(item.status);
                    return (
                        <li key={item.accessToken}>
                            <Link to={`/rezervasyon/${item.accessToken}`}
                                className="flex items-center gap-4 rounded-[18px] border border-[var(--site-border)] bg-[var(--site-card)] p-3.5 text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]">
                                <span className="flex w-[60px] shrink-0 flex-col items-center rounded-[14px] bg-[var(--site-bg)] py-2">
                                    <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--site-sub)]">{parts.weekday}</span>
                                    <span className={cn(serif, 'text-[30px] leading-none tabular-nums')}>{parts.day}</span>
                                    <span className="text-[11px] text-[var(--site-sub)]">{parts.month}</span>
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className={cn('inline-block rounded-full px-2.5 py-1 text-[11px] font-bold', badge.className)}>{badge.text}</span>
                                    <span className="mt-1 block text-[15px] font-semibold tabular-nums">{item.time} · {item.partySize} kişi · {item.tableName}</span>
                                    {item.code && <span className="block font-mono text-sm font-semibold tracking-[0.08em] text-[var(--site-sub)]">{item.code}</span>}
                                </span>
                                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

// Hata sonrası "Kodu nerede bulurum?": onay ekranındaki biletin küçük çizimi. Hangi alanın yanlış olduğu söylenmez.
function CodeHelp({ restaurant }: { restaurant: string }) {
    return (
        <section aria-labelledby="sorgu-yardim" className="flex items-center gap-4 rounded-[22px] border border-[var(--site-border)] bg-[var(--site-card)] p-5">
            <div aria-hidden="true" className="flex w-[112px] shrink-0 flex-col items-center gap-1.5 rounded-[14px] bg-[var(--site-paper)] px-2 pb-3 pt-2.5 text-[var(--site-on-paper)]">
                <span className="max-w-full truncate text-[8px] font-medium uppercase tracking-[0.2em] text-[var(--site-on-paper-sub)]">{restaurant}</span>
                <span className="rounded-md border border-[var(--site-accent)] px-1.5 py-0.5 font-mono text-[15px] font-bold tracking-[0.12em]">K7M-2QP</span>
            </div>
            <div className="min-w-0">
                <h2 id="sorgu-yardim" className="m-0 text-[15px] font-semibold">Kodu nerede bulurum?</h2>
                <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--site-sub)]">
                    Talep gönderince açılan onay ekranının üstünde, 6 karakterlik koyu kutuda. Kodu ve rezervasyonda yazdığınız numarayı kontrol edin.
                </p>
            </div>
        </section>
    );
}
