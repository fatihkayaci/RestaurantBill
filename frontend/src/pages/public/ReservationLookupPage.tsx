import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarPlus, Check, CircleAlert, Phone } from 'lucide-react';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    RESERVATION_CODE_LENGTH, compactReservationCode, formatReservationCodeInput, formatTurkishPhoneInput,
} from '@/features/customerSite/reservationCode';
import { canReserveOnline } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, serif } from './site/siteParts';
import { resolveDesign, telHref } from './site/siteTheme';
import { EliteHero, EliteKicker } from './site/elite/EliteBits';
import { rememberReservationToken, restaurantName, useMyReservations, useSite } from './site/useSite';
import { dateParts, reservationStatusBadge } from './reservationCalendar';
import { reservationTone } from './reservationTone';
import type { ReservationStatusInfo } from '@/features/customerSite/types';

const NOT_FOUND = 'Bu bilgilerle bir rezervasyon bulunamadı.';
const TOO_MANY = 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';

const inputClass = 'h-[60px] w-full rounded-[18px] border-0 bg-[var(--site-card)] px-5 text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-3 focus:outline-offset-2 focus:outline-[var(--site-on-terracotta)] aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-dashed aria-[invalid=true]:outline-[var(--site-on-terracotta)]';

// /rezervasyon-sorgula (tasarım: "Renkli · Rezervasyon sorgula"): solda kiremit kutuda kod + telefon formu, sağda krem
// kutuda bu cihazdaki rezervasyon kartları (yoksa "Kodunuzu girin"). Bağlantısını kaybeden müşteri kısa kod ("K7M-2QP") ve rezervasyondaki telefonla rezervasyon
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
    const elit = resolveDesign(site.site.design) === 'elit';

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
        <SitePage site={site} current="rezervasyon-sorgula" overlayHeader={elit}>
            {/* Elit: tam genişlik fotoğraf kapağı; sorgu kutusu ara bant renginde, başlığı kapakta. */}
            {elit && <EliteHero titleId="sorgu-kapak" label="Rezervasyon" title={<>Rezervasyonunuzu <em className="italic">sorgulayın.</em></>}
                image={site.site.reservationHeroUrl || site.site.coverImageUrl} ownImage imageTarget="photo:hero-rezervasyon" imageLabel="Rezervasyon kapağı" emptyHint="" />}
            <main className={cn('mx-auto flex w-full flex-1 flex-col gap-4 leading-normal text-[var(--site-text)]', elit ? 'max-w-[1280px] px-4 py-12 sm:px-10 md:py-20' : 'max-w-[1440px] px-2 pb-4 pt-4 sm:px-4')}>
                <div className={cn('grid grid-cols-1 lg:grid-cols-2 lg:items-stretch', elit ? 'gap-6' : 'gap-4')}>
                    {/* ── Sorgu: kiremit kutu, dama deseni, krem alanlar ── */}
                    <section aria-labelledby="sorgu-baslik"
                        className={cn('relative flex flex-col justify-between gap-10 overflow-hidden px-5 py-9 sm:px-10 md:p-14',
                            elit ? 'bg-[var(--site-alt)] text-[var(--site-text)] [--site-on-terracotta:var(--site-text)] [--site-on-terracotta-soft:var(--site-sub)] [--site-pop:var(--site-paper)] [--site-on-pop:var(--site-on-paper)]'
                                : 'rounded-[24px] bg-[var(--site-terracotta)] text-[var(--site-on-terracotta)] md:rounded-[36px] lg:min-h-[620px] [--site-accent-text:var(--site-on-terracotta-soft)]')}>
                        {!elit && <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[repeating-conic-gradient(from_45deg,color-mix(in_srgb,currentColor_7%,transparent)_0_25%,transparent_0_50%)] bg-[length:34px_34px]" />}
                        <div className="relative flex flex-col gap-4">
                            {elit ? (
                                <h2 id="sorgu-baslik" className="m-0"><EliteKicker>Sorgula</EliteKicker></h2>
                            ) : (
                                <>
                            <span className="inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-on-terracotta-soft)]">
                                <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-current" />{name} · Rezervasyon
                            </span>
                            <h1 id="sorgu-baslik" className={cn(serif, 'm-0 break-words text-[clamp(34px,9.4vw,56px)] font-extrabold leading-[0.92] tracking-[-0.025em] xl:text-[clamp(56px,4.6vw,80px)]')}>
                                Rezervasyonunuzu<br /><em className="rb-accent font-semibold italic">sorgulayın.</em>
                            </h1>
                                </>
                            )}
                            <p className="m-0 max-w-[440px] text-base leading-relaxed">
                                Bağlantınızı mı kaybettiniz? Rezervasyon kodunuz ve telefon numaranızla rezervasyonunuza ulaşın; durumunu görün ya da iptal edin.
                            </p>
                        </div>

                        <form onSubmit={submit} noValidate className="relative flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="sorgu-kod" className="text-[13px] font-extrabold">Rezervasyon kodu</label>
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
                                    className={cn(inputClass, serif, 'text-[24px] font-bold uppercase tracking-[0.06em] placeholder:font-semibold')}
                                />
                                <div className="flex items-center justify-between gap-3 text-[13px] text-[var(--site-on-terracotta-soft)]">
                                    <p id="sorgu-kod-ipucu" className="m-0">6 karakter; harfler ve rakamlar (0, O, 1, I, L kullanılmaz).</p>
                                    <span aria-hidden="true" className="shrink-0 font-bold tabular-nums">
                                        {codeLength === RESERVATION_CODE_LENGTH && <Check className="mr-1 inline h-3.5 w-3.5 align-[-2px]" strokeWidth={3} />}
                                        {codeLength}/{RESERVATION_CODE_LENGTH}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="sorgu-telefon" className="text-[13px] font-extrabold">Telefon</label>
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
                                    className={cn(inputClass, 'text-[17px] font-semibold tabular-nums')}
                                />
                            </div>

                            {formError && (
                                <p role="alert" className="m-0 flex items-start gap-2.5 rounded-[18px] border border-[var(--site-error-line)] bg-[var(--site-error-bg)] p-3.5 text-sm font-semibold text-[var(--site-error)]">
                                    <CircleAlert className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
                                    {formError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={sending}
                                className="mt-1.5 flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-[var(--site-pop)] text-base font-extrabold text-[var(--site-on-pop)] transition-opacity hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-on-terracotta)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sending ? (
                                    <>
                                        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                                        Sorgulanıyor…
                                    </>
                                ) : (
                                    <>
                                        Sorgula
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </>
                                )}
                            </button>
                            {site.phone && (
                                <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-[13px]">
                                    Kodunuzu bulamadınız mı?
                                    <a href={telHref(site.phone)} className="inline-flex min-h-11 items-center gap-1.5 font-extrabold text-[var(--site-on-terracotta)] underline underline-offset-4">
                                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />Bizi arayın · <span className="tabular-nums">{site.phone}</span>
                                    </a>
                                </p>
                            )}
                        </form>
                    </section>

                    {/* ── Sonuç tarafı: bu cihazdaki rezervasyonlar ya da boş kart ── */}
                    <section aria-label="Rezervasyon kartınız" className="flex min-w-0 flex-col gap-6 rounded-[24px] bg-[var(--site-card)] p-5 sm:p-8 md:rounded-[36px] md:p-12">
                        {mine.length > 0 ? <SavedReservations items={mine} /> : <EmptyResult />}

                        {formError && formError !== TOO_MANY && <CodeHelp restaurant={name} />}

                        {canReserveOnline(site) && (
                            <Link to={RESERVATION_PATH}
                                className="mt-auto flex min-h-[54px] items-center justify-between gap-3 rounded-full bg-[var(--site-bg)] py-2 pl-5 pr-2 text-[var(--site-text)] no-underline transition-opacity hover:opacity-90">
                                <span className="text-[15px]">Rezervasyonunuz yok mu? <span className="font-extrabold">Masa ayırtın</span></span>
                                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)]"><CalendarPlus className="h-4 w-4" /></span>
                            </Link>
                        )}
                    </section>
                </div>
            </main>
        </SitePage>
    );
}

// Henüz sorgulanmadı: kesikli dairede soru işaretli kod, "Kodunuzu girin".
function EmptyResult() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 py-6 text-center text-[var(--site-muted)]">
            <span aria-hidden="true" className={cn(serif, 'flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-dashed border-[var(--site-border-mid)] text-[30px] italic text-[var(--site-terracotta-text)]')}>K7M-?</span>
            <h2 className={cn(serif, 'm-0 text-[28px] leading-tight text-[var(--site-text)] md:text-[30px]')}>Kodunuzu girin</h2>
            <p className="m-0 max-w-[360px] text-[15px] leading-relaxed">Kod ve telefon numarası eşleşince rezervasyon kartınız açılır: durumu, saati, masası ve iptal.</p>
        </div>
    );
}

// Bu cihazdaki rezervasyonlar: durum renginde tarih yarısı ve bilgiler (bilet); dokununca rezervasyon kartı açılır.
function SavedReservations({ items }: { items: ReservationStatusInfo[] }) {
    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--site-muted)]">Bu cihazda</span>
                <h2 className={cn(serif, 'm-0 text-[30px] leading-none md:text-[40px]')}>Rezervasyon kartlarınız</h2>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {items.map(item => {
                    const parts = dateParts(item.date);
                    const badge = reservationStatusBadge(item.status);
                    const tone = reservationTone(item.status);
                    return (
                        <li key={item.accessToken}>
                            <Link to={`/rezervasyon/${item.accessToken}`}
                                className="flex overflow-hidden rounded-[22px] bg-[var(--site-bg)] text-[var(--site-text)] no-underline transition-transform hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-text)] motion-reduce:transition-none">
                                <span className={cn('flex w-[84px] shrink-0 flex-col items-center justify-center px-2 py-3 sm:w-[104px]', tone.ticket)}>
                                    <span className={cn(serif, 'text-[34px] font-extrabold leading-none tabular-nums')}>{parts.day}</span>
                                    <span className="text-xs font-bold">{parts.month}</span>
                                    <span className={cn(serif, 'text-[13px] italic')}>{parts.weekday}</span>
                                </span>
                                <span aria-hidden="true" className="w-0 border-l-[3px] border-dashed border-[var(--site-card)]" />
                                <span className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                                    <span className="min-w-0 flex-1">
                                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold', tone.badge)}>
                                            <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />{badge.text}
                                        </span>
                                        <span className={cn(serif, 'mt-1 block text-[20px] leading-tight tabular-nums')}>{item.time} · {item.partySize} kişi</span>
                                        <span className="block truncate text-sm text-[var(--site-sub)]">{item.tableName}{item.code && <> · <span className="font-mono font-semibold tracking-[0.08em]">{item.code}</span></>}</span>
                                    </span>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--site-sub)]" aria-hidden="true" />
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            <p className="m-0 text-sm text-[var(--site-muted)]">Listede olmayan bir rezervasyon için kodu ve telefon numarasını girin.</p>
        </div>
    );
}

// Hata sonrası "Kodu nerede bulurum?": onay ekranındaki biletin küçük çizimi. Hangi alanın yanlış olduğu söylenmez.
function CodeHelp({ restaurant }: { restaurant: string }) {
    return (
        <section aria-labelledby="sorgu-yardim" className="flex items-center gap-4 rounded-[22px] bg-[var(--site-bg)] p-5">
            <div aria-hidden="true" className="flex w-[112px] shrink-0 flex-col items-center gap-1.5 rounded-[14px] bg-[var(--site-paper)] px-2 pb-3 pt-2.5 text-[var(--site-on-paper)]">
                <span className="max-w-full truncate text-[8px] font-medium uppercase tracking-[0.2em] text-[var(--site-on-paper-sub)]">{restaurant}</span>
                <span className="rounded-md border border-[var(--site-accent)] px-1.5 py-0.5 font-mono text-[15px] font-bold tracking-[0.12em]">K7M-2QP</span>
            </div>
            <div className="min-w-0">
                <h2 id="sorgu-yardim" className="m-0 text-[15px] font-extrabold">Kodu nerede bulurum?</h2>
                <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--site-sub)]">
                    Talep gönderince açılan onay ekranının üstünde, 6 karakterlik koyu kutuda. Kodu ve rezervasyonda yazdığınız numarayı kontrol edin.
                </p>
            </div>
        </section>
    );
}
