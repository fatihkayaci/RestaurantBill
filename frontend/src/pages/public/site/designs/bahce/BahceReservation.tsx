import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline, formatDuration, type PublicSite } from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import ReservationFlow from '../../ReservationFlow';
import { PageEmpty, SitePage } from '../../SiteFrame';
import { reservationHref, serif } from '../../siteParts';
import { telHref } from '../../siteTheme';
import { restaurantName, useMyReservations } from '../../useSite';
import { ExternalHint } from '../../siteEdit';
import { editExternal, useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { reservationChoice } from '../meyhane/meyhaneParts';
import { DrawnPlate, MorningChip, SunMark } from './BahceBits';
import { bhDisplay, bhLink, bhWrap, upcomingWeekend } from './bahceParts';

// Bahçe Kahvaltısı rezervasyon sayfası: kapak panosunda "Sofranızı ayırtın", kısa açıklama, bugünün saati ve sorgulama
// bağlantısı. Rezervasyon hafta sonu açıksa altında "Hafta sonu kahvaltısı" şeridi: yaklaşan Cumartesi ve Pazar'ın
// GERÇEK başlangıç aralığı ve saat çipleri (seçilince akış o gün ve saatle, 2 kişilik açılır; kişi sayısı akışta
// değişir, dolu saat akışta görünür). Altında iki sütun: solda ortak rezervasyon akışı yuvarlak kartta, sağda (telefonda
// altta) "Bilmeniz gerekenler" tabakları: masada kalma süresi, online en kalabalık grup, ileri tarih. Kapalıysa telefon.

export default function BahceReservation({ site }: DesignPageProps) {
    const { mine, add } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const edit = useSiteEdit();
    const textX = editExternal(edit, 'reservationText');
    const name = restaurantName(site);
    const open = canReserveOnline(site);

    const hero = (
        <section aria-labelledby="bh-rz" className="px-2.5 pb-8 pt-4 sm:px-5 sm:pt-6">
            <div className="relative mx-auto flex max-w-[1200px] flex-col items-start gap-5 overflow-hidden rounded-[40px] bg-[var(--site-hero-bg)] px-5 py-12 text-[var(--site-on-cover)] sm:px-12 sm:py-16">
                <span aria-hidden="true" className="rb-bh-table pointer-events-none absolute -right-[14%] -top-[50%] h-[150%] w-[52%] rounded-full opacity-70 max-sm:hidden" />
                <SunMark className="relative h-12 w-12" />
                <h1 id="bh-rz" className={cn(bhDisplay, 'relative max-w-[12ch] text-[52px] sm:text-[84px] md:text-[100px]')}>Sofranızı ayırtın</h1>
                {open && (
                    <p {...textX} className={cn('relative m-0 max-w-[44ch] text-[18px] leading-snug sm:text-[21px]', textX.className)}>
                        Gününüzü, saatinizi ve masanızı seçin; talebiniz restorana iletilir, onaylanınca masanız sizi bekler.
                    </p>
                )}
                <MorningChip site={site} tone="cover" weekend className="relative" />
                {open && !edit && <Link to={RESERVATION_LOOKUP_PATH} className="relative inline-flex min-h-11 items-center text-[15px] font-bold text-[var(--site-on-cover)] underline decoration-[var(--site-mustard)] decoration-[3px] underline-offset-[6px]">Rezervasyonumu sorgula</Link>}
            </div>
        </section>
    );

    if (!open) {
        return (
            <SitePage site={site} current="rezervasyon">
                <main className="flex flex-1 flex-col">
                    {hero}
                    <PageEmpty label="Rezervasyon" text="Online rezervasyon şu an alınmıyor.">
                        {site.phone && (
                            <p className="m-0 text-[var(--site-sub)]">
                                Masa ayırtmak için arayın: <a href={telHref(site.phone)} className="inline-flex min-h-11 items-center whitespace-nowrap font-bold text-[var(--site-text)]">{site.phone}</a>
                            </p>
                        )}
                    </PageEmpty>
                </main>
            </SitePage>
        );
    }

    return (
        <SitePage site={site} current="rezervasyon">
            <main className="flex flex-1 flex-col">
                {hero}
                <ExternalHint source="reservation">
                    <WeekendSlots site={site} />
                    <div className={cn(bhWrap, 'grid items-start gap-10 pb-20 pt-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12')}>
                        <div className="min-w-0 rounded-[32px] border border-[var(--site-border)] bg-[var(--site-card)] p-2 leading-normal text-[var(--site-text)] shadow-[0_30px_60px_-44px_color-mix(in_srgb,var(--site-text)_60%,transparent)] sm:p-6">
                            <ReservationFlow
                                // Hızlı seçiciden yeni bir seçimle gelinirse akış o seçimle baştan kurulur.
                                key={params.toString()}
                                site={site}
                                restaurantName={name}
                                mine={mine}
                                onSent={add}
                                onClose={() => navigate('/')}
                                initial={reservationChoice(params)}
                                embedded
                            />
                        </div>
                        <Notes site={site} />
                    </div>
                </ExternalHint>
            </main>
        </SitePage>
    );
}

/** Yaklaşan hafta sonunun gerçek başlangıç saatleri; seçilen saat akışı o gün ve saatle açar. Yoksa çizilmez. */
function WeekendSlots({ site }: { site: PublicSite }) {
    const [params] = useSearchParams();
    const days = upcomingWeekend(site, new Date(), 8);
    if (days.length === 0) return null;
    const chosenDate = params.get('tarih');
    const chosenTime = params.get('saat');
    return (
        <section aria-labelledby="bh-hs" className={cn(bhWrap, 'pb-8')}>
            <div className="flex flex-col gap-5 rounded-[32px] bg-[var(--site-mustard)] p-5 text-[var(--site-text)] sm:p-8">
                <div className="flex items-center gap-3">
                    <DrawnPlate kind="egg" className="w-12 shrink-0" />
                    <h2 id="bh-hs" className={cn(serif, 'm-0 text-[26px] leading-none tracking-[-0.03em] sm:text-[32px]')}>Hafta sonu kahvaltısı</h2>
                </div>
                <div className={cn('grid gap-5', days.length > 1 && 'md:grid-cols-2')}>
                    {days.map(day => (
                        <div key={day.date} className="flex flex-col gap-2.5 rounded-[24px] bg-[var(--site-card)] p-4 sm:p-5">
                            <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-3 text-[16px] font-bold">
                                <span className="first-letter:uppercase">{day.label}</span>
                                <span className="text-sm font-semibold tabular-nums text-[var(--site-sub)]">{day.window}</span>
                            </p>
                            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                                {day.times.map(t => {
                                    const on = chosenDate === day.date && chosenTime === t;
                                    return (
                                        <li key={t}>
                                            <Link to={reservationHref({ date: day.date, time: t, partySize: 2 })} replace aria-current={on ? 'true' : undefined}
                                                aria-label={`${day.label}, ${t}`}
                                                className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-bold tabular-nums no-underline transition-colors',
                                                    on ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'border-[var(--site-border-mid)] text-[var(--site-text)] hover:border-[var(--site-text)]')}>
                                                {t}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
                <p className="m-0 text-sm">Saat seçince akış o gün ve saatle açılır; kişi sayısını ve masayı aşağıda seçersiniz.</p>
            </div>
        </section>
    );
}

/** "Bilmeniz gerekenler": gerçek ayarlardan (masada kalma süresi, en kalabalık grup, ileri tarih) tabaklar ve telefon. */
function Notes({ site }: DesignPageProps) {
    const rules = site.reservation;
    const facts: { key: string; label: string; value: string }[] = [];
    if (rules.durationMinutes > 0) facts.push({ key: 'sure', label: 'Masada kalma', value: formatDuration(rules.durationMinutes) });
    if (rules.maxPartySize > 0) facts.push({ key: 'kisi', label: 'Online en çok', value: `${rules.maxPartySize} kişi` });
    if (rules.maxDaysAhead > 0) facts.push({ key: 'gun', label: 'İleri tarih', value: `${rules.maxDaysAhead} gün` });
    return (
        <aside aria-labelledby="bh-bilgi" className="flex flex-col gap-5 lg:sticky lg:top-28">
            <h2 id="bh-bilgi" className={cn(serif, 'm-0 text-[26px] leading-none tracking-[-0.03em]')}>Bilmeniz gerekenler</h2>
            {facts.length > 0 && (
                <dl className="m-0 grid grid-cols-3 gap-3 lg:grid-cols-1">
                    {facts.map(f => (
                        <div key={f.key} className="flex flex-col items-center gap-1 rounded-[24px] bg-[var(--site-alt)] p-3 text-center lg:flex-row lg:justify-between lg:rounded-full lg:px-5 lg:text-left">
                            <dt className="text-[13px] font-semibold text-[var(--site-sub)] lg:text-[15px]">{f.label}</dt>
                            <dd className="m-0 text-[16px] font-extrabold tabular-nums lg:text-[17px]">{f.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {site.phone && (
                <p className="m-0 text-[15px] leading-relaxed text-[var(--site-sub)]">
                    Daha kalabalık bir sofra ya da özel bir gün için arayın:{' '}
                    <a href={telHref(site.phone)} className={cn(bhLink, 'whitespace-nowrap')}>{site.phone}</a>
                </p>
            )}
        </aside>
    );
}
