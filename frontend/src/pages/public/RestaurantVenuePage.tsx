import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { ClockIcon, HeroStatusPill, InfoCard, InstagramIcon, OpenBadge, SeatingIcon } from './site/SiteCards';
import {
    RESERVATION_PATH, cardButton, cardValue, eyebrow, hasVenuePage, instagramHandle, serif, siteCardLg,
} from './site/siteParts';
import { hoursText, restaurantName, useSite } from './site/useSite';

const GALLERY = 6;

// /mekan: kısa kapakta restoranın mekân başlığı, alt yazısı ve "şu an açık" hapı; beyaz kartta menüden kareler
// (Instagram hapıyla); altında oturma bölümleri (masa sayısıyla), çalışma saatleri ve koyu rezervasyon kartı.
// Girilmemiş bilgi gösterilmez. Mekân bilgisi girilmemişse kısa bir "henüz eklenmedi" sayfası.
export default function RestaurantVenuePage() {
    const { site, error } = useSite();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const content = site.site;
    const name = restaurantName(site);

    if (!hasVenuePage(site)) {
        return (
            <SitePage site={site} current="mekan">
                <PageHero site={site} label={name} title="Mekân" />
                <PageEmpty text="Mekân bilgileri henüz eklenmedi." />
            </SitePage>
        );
    }

    const gallery = site.categories.flatMap(c => c.products).filter(p => p.imageUrl).slice(0, GALLERY);
    const hours = hoursText(site);
    const canReserve = canReserveOnline(site);
    const hasCards = Boolean(site.regions.length > 0 || hours || canReserve);

    return (
        <SitePage site={site} current="mekan">
            <PageHero site={site} label={`Mekân · ${name}`} title={content.headline || 'Mekân'} image={content.aboutImageUrl || undefined}
                compact titleClassName="text-[48px] leading-[0.98] md:text-[80px]" aside={<HeroStatusPill site={site} />}>
                {content.tagline && <p className="m-0 max-w-[60ch] text-base leading-normal text-[#F2EDE4] md:text-[17px]">{content.tagline}</p>}
            </PageHero>
            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-4 px-5 pb-12 pt-5 md:gap-6 md:px-12 md:pb-20 md:pt-16">
                {gallery.length >= 3 && (
                    <section aria-labelledby="mk-kareler" className={cn(siteCardLg, 'flex min-w-0 flex-col gap-5 p-4 md:gap-6 md:rounded-[28px] md:p-9')}>
                        <div className="flex flex-wrap items-end justify-between gap-4 px-1 pt-1 md:p-0">
                            <div className="flex min-w-0 flex-col gap-2">
                                <span className={eyebrow}>Menüden kareler</span>
                                <h2 id="mk-kareler" className={cn(serif, 'm-0 text-[34px] leading-[1.05] md:text-[44px]')}>Masamızdan <span className="italic">birkaç an.</span></h2>
                            </div>
                            {content.instagramUrl && (
                                <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={cn(cardButton.outline, 'self-auto [&>svg]:h-4 [&>svg]:w-4')}>
                                    <InstagramIcon />
                                    {instagramHandle(content.instagramUrl)}
                                </a>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3">
                            {gallery.map(p => (
                                <Link key={p.id} to="/menu" className="group block overflow-hidden rounded-[14px] md:rounded-[18px]">
                                    <img src={p.imageUrl} alt={p.name} loading="lazy"
                                        className="block aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none" />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {hasCards && (
                    <section aria-label="Mekân bilgileri" className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
                        {site.regions.length > 0 && (
                            <InfoCard icon={<SeatingIcon />} label="Oturma" labelId="mk-oturma">
                                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                                    {site.regions.map(region => (
                                        <li key={region.id} className="flex items-baseline justify-between gap-4 border-t border-[#EEE9E1] pt-3">
                                            <span className={cn(cardValue, 'min-w-0 break-words leading-none')}>{region.name}</span>
                                            {region.tables.length > 0 && <span className="shrink-0 text-sm text-[#5E5850]">{region.tables.length} masa</span>}
                                        </li>
                                    ))}
                                </ul>
                            </InfoCard>
                        )}
                        {hours && (
                            <InfoCard icon={<ClockIcon />} label="Çalışma saatleri" labelId="mk-saat"
                                action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                                {/* Saat verisi tek aralık (her gün aynı); günlere göre saat gelirse burada satır satır listelenir. */}
                                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                    <span className="text-[15px] font-semibold">Her gün</span>
                                    <span className={cn(cardValue, 'tabular-nums')}>{hours}</span>
                                </div>
                                {content.hoursNote && <p className="m-0 text-sm text-[#5E5850]">{content.hoursNote}</p>}
                            </InfoCard>
                        )}
                        {canReserve && (
                            <InfoCard tone="dark" label="Rezervasyon" labelId="mk-rez" className="justify-between"
                                action={<Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'h-12 w-full px-[22px] text-[15px] sm:w-auto')}>Masa ayırt</Link>}>
                                <p className={cn(serif, 'm-0 text-[30px] leading-[1.05] md:text-[36px]')}>Masanızı <span className="italic">siz seçin.</span></p>
                            </InfoCard>
                        )}
                    </section>
                )}
            </main>
        </SitePage>
    );
}
