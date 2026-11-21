import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline, formatDuration } from '@/features/customerSite/types';
import { RESERVATION_LOOKUP_PATH } from '@/features/customerSite/reservationCode';
import { cn } from '@/lib/utils';
import ReservationFlow from '../../ReservationFlow';
import { PageEmpty, SitePage } from '../../SiteFrame';
import { serif } from '../../siteParts';
import { telHref } from '../../siteTheme';
import { restaurantName, useMyReservations, weekSchedule } from '../../useSite';
import { ExternalHint } from '../../siteEdit';
import { editExternal, useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { LampString, NightBackdrop, TonightStrip } from './MeyhaneBits';
import { mhLeader, mhLink, mhSign, mhUnderHeader, mhWrap, reservationChoice } from './meyhaneParts';

// Meyhane Gecesi rezervasyon sayfası: gece kapağında "Masa ayırt" tabelası, kısa açıklama, bu akşamın saati ve
// sorgulama bağlantısı. Altında iki sütun: solda rezervasyon akışı (ortak ReservationFlow, çift çizgi çerçeveli kartta),
// sağda (telefonda altta) "Bilmeniz gerekenler": haftanın saatleri, masada kalma süresi, en kalabalık grup ve telefon.
// Ana sayfadaki hızlı seçici seçimi ?tarih&saat&kisi ile gelir. Rezervasyon kapalıysa kısa bilgi ve telefon.

export default function MeyhaneReservation({ site }: DesignPageProps) {
    const { mine, add } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const edit = useSiteEdit();
    const textX = editExternal(edit, 'reservationText');
    const name = restaurantName(site);
    const open = canReserveOnline(site);

    const hero = (
        <section aria-labelledby="mh-rz" className={cn('relative isolate overflow-hidden', !edit && mhUnderHeader)}>
            <NightBackdrop image={site.site.reservationHeroUrl || undefined} target="photo:hero-rezervasyon" label="Rezervasyon kapağı" emptyHint="+ Rezervasyon kapağı seç" />
            <LampString className="top-[76px] lg:top-[92px]" sag={30} />
            <div className="pointer-events-none relative z-[1] [&_[data-edit-target]]:pointer-events-auto [&_[data-edit-external]]:pointer-events-auto mx-auto flex max-w-[860px] flex-col items-center gap-5 px-4 pb-12 pt-[150px] text-center sm:px-8 lg:pt-[176px] [&_a]:pointer-events-auto">
                <h1 id="mh-rz" className={cn(mhSign, 'text-[60px] sm:text-[96px] md:text-[120px]')}>Masa ayırt</h1>
                {open && (
                    <p {...textX} className={cn(serif, 'm-0 max-w-[34ch] text-[20px] leading-snug sm:text-[24px]', textX.className)}>
                        Gününüzü, saatinizi ve masanızı seçin; talebiniz restorana iletilir, onaylanınca masanız sizi bekler.
                    </p>
                )}
                <TonightStrip site={site} />
                {open && !edit && <Link to={RESERVATION_LOOKUP_PATH} className={mhLink}>Rezervasyonumu sorgula</Link>}
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
                    <div className={cn(mhWrap, 'grid items-start gap-10 pb-20 pt-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14')}>
                        <div className="min-w-0 rounded-[20px] border border-[var(--site-border-mid)] bg-[var(--site-card)] p-2 leading-normal text-[var(--site-text)] outline outline-1 outline-offset-[6px] outline-[var(--site-border)] sm:p-6">
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

/** "Bilmeniz gerekenler": gerçek ayarlardan (saatler, masada kalma süresi, en kalabalık grup) ve telefon. */
function Notes({ site }: DesignPageProps) {
    const rows = weekSchedule(site);
    const rules = site.reservation;
    const facts: { key: string; label: string; value: string }[] = [];
    if (rules.durationMinutes > 0) facts.push({ key: 'sure', label: 'Masada kalma', value: formatDuration(rules.durationMinutes) });
    if (rules.maxPartySize > 0) facts.push({ key: 'kisi', label: 'Online en çok', value: `${rules.maxPartySize} kişi` });
    if (rules.maxDaysAhead > 0) facts.push({ key: 'gun', label: 'İleri tarih', value: `${rules.maxDaysAhead} gün sonrasına kadar` });
    return (
        <aside aria-labelledby="mh-bilgi" className="flex flex-col gap-6 lg:sticky lg:top-24">
            <h2 id="mh-bilgi" className={cn(serif, 'm-0 text-[28px] leading-none')}>Bilmeniz gerekenler</h2>
            {facts.length > 0 && (
                <dl className="m-0 flex flex-col border-t border-[var(--site-border-mid)]">
                    {facts.map(f => (
                        <div key={f.key} className="flex items-baseline gap-3 border-b border-[var(--site-line)] py-3 text-[15px]">
                            <dt className="text-[var(--site-sub)]">{f.label}</dt><span aria-hidden="true" className={mhLeader} /><dd className="m-0 font-bold">{f.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {rows && (
                <dl className="m-0 flex flex-col">
                    {rows.map(r => (
                        <div key={r.day} className={cn('flex items-baseline gap-3 py-1.5 text-[15px]', r.isToday ? 'font-bold text-[var(--site-text)]' : 'text-[var(--site-sub)]')}>
                            <dt>{r.label}</dt><span aria-hidden="true" className={mhLeader} /><dd className={cn('m-0 tabular-nums', r.isToday && 'text-[var(--site-accent-text)]')}>{r.text}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {site.phone && (
                <p className="m-0 text-[15px] leading-relaxed text-[var(--site-sub)]">
                    Daha kalabalık bir sofra ya da özel bir gün için arayın:{' '}
                    <a href={telHref(site.phone)} className="inline-flex min-h-11 items-center whitespace-nowrap font-bold text-[var(--site-text)] underline decoration-[var(--site-accent-line)] underline-offset-4">{site.phone}</a>
                </p>
            )}
        </aside>
    );
}
