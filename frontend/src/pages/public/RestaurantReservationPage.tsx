import { useNavigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import ReservationFlow from './site/ReservationFlow';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { AccentTitle, PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { telHref } from './site/siteTheme';
import { restaurantName, useMyReservations, useSite } from './site/useSite';
import { ExternalHint } from './site/siteEdit';
import { editExternal, useSiteEdit } from './site/siteEditContext';

// /rezervasyon: tam rezervasyon akışı (ortak başlık ve alt bilgiyle). Ana sayfadaki hızlı seçici seçimi
// ?tarih=2026-11-14&saat=19:00&kisi=2 ile gelir. Rezervasyon kapalıysa kısa bir bilgi sayfası.
export default function RestaurantReservationPage() {
    const { site, error } = useSite();
    const { mine, add } = useMyReservations();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const textX = editExternal(useSiteEdit(), 'reservationText');

    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const name = restaurantName(site);

    if (!canReserveOnline(site)) {
        return (
            <SitePage site={site} current="rezervasyon">
                <PageHero site={site} label={name} title="Rezervasyon" image={site.site.reservationHeroUrl} imageTarget="photo:hero-rezervasyon" imageLabel="Rezervasyon kapağı" />
                <PageEmpty label="Rezervasyon" text="Online rezervasyon şu an alınmıyor.">
                    {site.phone && (
                        <p className="m-0 text-[var(--site-sub)]">
                            Masa ayırtmak için bizi arayın: <a href={telHref(site.phone)} className="whitespace-nowrap font-bold text-[var(--site-text)]">{site.phone}</a>
                        </p>
                    )}
                </PageEmpty>
            </SitePage>
        );
    }

    const date = params.get('tarih');
    const time = params.get('saat');
    const partySize = Number(params.get('kisi'));
    const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && time && /^\d{2}:\d{2}$/.test(time) && partySize > 0;
    const initial = valid ? { date, time, partySize } : undefined;

    return (
        <SitePage site={site} current="rezervasyon">
            <PageHero site={site} label={`${name} · Rezervasyon`} compact
                image={site.site.reservationHeroUrl} imageTarget="photo:hero-rezervasyon" imageLabel="Rezervasyon kapağı"
                title={<span {...textX} className={textX.className}><AccentTitle text="Masanızı ayırtın." /></span>}>
                <p {...textX} className={cn('m-0 max-w-[46ch] text-base leading-relaxed text-[var(--site-sub)] md:text-[17px]', textX.className)}>
                    Gününüzü, saatinizi ve masanızı seçin; talebiniz restorana iletilir, onaylanınca masanız sizi bekler.
                </p>
            </PageHero>
            <ExternalHint source="reservation" className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col bg-[var(--site-bg)] leading-normal text-[var(--site-text)]">
                <ReservationFlow
                    // Hızlı seçiciden yeni bir seçimle gelinirse akış o seçimle baştan kurulur.
                    key={params.toString()}
                    site={site}
                    restaurantName={name}
                    mine={mine}
                    onSent={add}
                    onClose={() => navigate('/')}
                    initial={initial}
                    embedded
                />
            </div>
            </ExternalHint>
        </SitePage>
    );
}
