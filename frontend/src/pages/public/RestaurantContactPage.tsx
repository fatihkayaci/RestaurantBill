import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { HoursTable, PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, eyebrow, hasContactPage, instagramHandle, line, moreArrow, moreLink, serif } from './site/siteParts';
import { directionsUrl, telHref } from './site/siteTheme';
import { fullAddress, hoursText, restaurantName, useSite } from './site/useSite';

// /iletisim (restoranın alan adında): adres + yol tarifi, çalışma saatleri ve şu an açık mı, telefon, Instagram.
// Harita gömülmez (üçüncü taraf çerez/CSP); "Yol tarifi al" Google Haritalar'ı yeni sekmede açar.
export default function RestaurantContactPage() {
    const { site, error } = useSite();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const content = site.site;
    const name = restaurantName(site);

    if (!hasContactPage(site)) {
        return (
            <SitePage site={site} current="iletisim">
                <PageHero site={site} label={name} title="İletişim" />
                <PageEmpty text="İletişim bilgileri henüz eklenmedi." />
            </SitePage>
        );
    }

    const address = fullAddress(site);
    const hours = hoursText(site);
    const card = cn('flex min-w-0 flex-col items-start gap-3 border-t pt-6', line);

    return (
        <SitePage site={site} current="iletisim">
            <PageHero site={site} label={name} title="İletişim">
                {site.isOpenNow !== null && hours && (
                    <span className="flex items-center gap-2.5 text-sm">
                        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', site.isOpenNow ? 'bg-[#5EE08F]' : 'bg-[#F4A28C]')} />
                        {site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı'} · Her gün {hours}
                    </span>
                )}
            </PageHero>
            <main className="flex-1">
                <div className="mx-auto grid max-w-[1344px] grid-cols-1 gap-x-16 gap-y-14 px-5 py-20 md:grid-cols-2 md:px-12 md:py-[110px]">
                    {address && (
                        <section aria-labelledby="ilt-adres" className={card}>
                            <h2 id="ilt-adres" className={cn(eyebrow, 'm-0')}>Adres</h2>
                            <p className={cn(serif, 'm-0 text-[34px] leading-[1.1] md:text-[44px]')}>{address}</p>
                            <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={moreLink}>
                                Yol tarifi al <span aria-hidden="true" className={moreArrow}>→</span>
                            </a>
                        </section>
                    )}
                    {hours && (
                        <section aria-labelledby="ilt-saat" className={card}>
                            <h2 id="ilt-saat" className={cn(eyebrow, 'm-0')}>Çalışma saatleri</h2>
                            <HoursTable site={site} className="w-full" />
                        </section>
                    )}
                    {site.phone && (
                        <section aria-labelledby="ilt-tel" className={card}>
                            <h2 id="ilt-tel" className={cn(eyebrow, 'm-0')}>Telefon</h2>
                            <a href={telHref(site.phone)} className={cn(serif, 'text-[34px] leading-none text-[#141414] md:text-[44px]')}>{site.phone}</a>
                        </section>
                    )}
                    {content.instagramUrl && (
                        <section aria-labelledby="ilt-ig" className={card}>
                            <h2 id="ilt-ig" className={cn(eyebrow, 'm-0')}>Instagram</h2>
                            <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={cn(serif, 'break-all text-[34px] leading-none text-[#141414] md:text-[44px]')}>
                                {instagramHandle(content.instagramUrl)}
                            </a>
                        </section>
                    )}
                </div>
                {canReserveOnline(site) && (
                    <section className={cn('border-t bg-[#EDE8DF]', line)}>
                        <div className="mx-auto flex max-w-[1344px] flex-wrap items-center justify-between gap-6 px-5 py-14 md:px-12">
                            <p className={cn(serif, 'm-0 text-[40px] leading-none md:text-[56px]')}>Masanızı <span className="italic">ayırtın.</span></p>
                            <Link to={RESERVATION_PATH} className="flex h-14 items-center rounded-full bg-[var(--site-accent)] px-[30px] font-semibold text-[var(--site-on-accent)]">Masa ayırt</Link>
                        </div>
                    </section>
                )}
            </main>
        </SitePage>
    );
}
