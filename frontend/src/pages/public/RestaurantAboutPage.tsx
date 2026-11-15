import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { ClockIcon, CupIcon, HeroStatusPill, InfoCard, MapPinIcon, OpenBadge, SeatingIcon } from './site/SiteCards';
import {
    RESERVATION_PATH, cardButton, cardLink, eyebrow, hasAboutPage, hasVenuePage, serif, siteCardDark, siteCardLg,
} from './site/siteParts';
import { directionsUrl } from './site/siteTheme';
import { fullAddress, hoursText, restaurantName, useSite } from './site/useSite';

// /hakkimizda: kısa kapak + "şu an açık" hapı; tek beyaz kartta restoranın "Hakkımızda" başlığı, yazısı ve hikâye
// fotoğrafı; altında gerçek verilerden ikonlu kartlar (konum, saatler, menü, oturma bölümleri) ve koyu rezervasyon
// kartı. Girilmemiş bilgi gösterilmez. Yazı girilmemişse kısa bir "henüz eklenmedi" sayfası.

/** Kartlardaki serif değer (konum, saat, menü sayısı, bölümler). */
const factValue = cn(serif, 'break-words text-[26px] leading-[1.05] md:text-[30px]');

export default function RestaurantAboutPage() {
    const { site, error } = useSite();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const content = site.site;
    const name = restaurantName(site);

    if (!hasAboutPage(site)) {
        return (
            <SitePage site={site} current="hakkimizda">
                <PageHero site={site} label={name} title="Hakkımızda" />
                <PageEmpty text="Hakkımızda yazısı henüz eklenmedi." />
            </SitePage>
        );
    }

    const location = [site.district, site.city].filter(Boolean).join(', ');
    const address = fullAddress(site);
    const hours = hoursText(site);
    const productCount = site.categories.reduce((sum, c) => sum + c.products.length, 0);
    const hasVenue = hasVenuePage(site);
    const canReserve = canReserveOnline(site);
    const hasFacts = Boolean(location || hours || productCount > 0 || site.regions.length > 0);

    return (
        <SitePage site={site} current="hakkimizda">
            <PageHero site={site} label={name} title="Hakkımızda" compact aside={<HeroStatusPill site={site} />} />
            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-4 px-5 pb-12 pt-5 md:gap-6 md:px-12 md:pb-20 md:pt-16">
                {/* Hikâye: yazı ve fotoğraf tek kartta (geniş ekranda yan yana, dar ekranda fotoğraf üstte) */}
                <section aria-labelledby={content.storyTitle ? 'hk-hikaye' : undefined} aria-label={content.storyTitle ? undefined : 'Hikâyemiz'}
                    className={cn(siteCardLg, 'grid grid-cols-1 overflow-hidden md:rounded-[28px]', content.aboutImageUrl && 'lg:grid-cols-2')}>
                    <div className="order-2 flex min-w-0 flex-col justify-center gap-4 p-6 md:gap-[22px] md:p-14 lg:order-1">
                        <span className={eyebrow}>Hikâyemiz</span>
                        {content.storyTitle && (
                            <h2 id="hk-hikaye" className={cn(serif, 'm-0 break-words text-[40px] leading-[1.02] md:text-[60px]')}>{content.storyTitle}</h2>
                        )}
                        {content.about && <p className="m-0 max-w-[60ch] whitespace-pre-line text-base leading-[1.6] text-[#5E5850] md:text-[17px]">{content.about}</p>}
                        <div className="flex flex-wrap gap-2.5 pt-1">
                            <Link to="/menu" className={cn(cardButton.accent, 'h-12 px-[22px] text-[15px]')}>Menüye göz atın</Link>
                            {hasVenue && <Link to="/mekan" className={cn(cardButton.outline, 'h-12 px-[22px] text-[15px]')}>Mekânı görün</Link>}
                        </div>
                    </div>
                    {content.aboutImageUrl && (
                        <div className="relative order-1 min-w-0 overflow-hidden lg:order-2 lg:min-h-[520px]">
                            <img src={content.aboutImageUrl} alt="" className="block aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.04] motion-reduce:transition-none md:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto lg:h-full" />
                        </div>
                    )}
                </section>

                {hasFacts && (
                    <section aria-label="Kısaca" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
                        {location && (
                            <InfoCard icon={<MapPinIcon />} label="Konum" labelId="hk-konum">
                                <span className={factValue}>{location}</span>
                                {address && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cardLink}>Yol tarifi al →</a>}
                            </InfoCard>
                        )}
                        {hours && (
                            <InfoCard icon={<ClockIcon />} label="Çalışma saatleri" labelId="hk-saat"
                                action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                                <span className={cn(factValue, 'tabular-nums')}>Her gün {hours}</span>
                            </InfoCard>
                        )}
                        {productCount > 0 && (
                            <InfoCard icon={<CupIcon />} label="Menü" labelId="hk-menu">
                                <span className={factValue}>{site.categories.length} kategori · {productCount} ürün</span>
                                <Link to="/menu" className={cardLink}>Menüyü gör →</Link>
                            </InfoCard>
                        )}
                        {site.regions.length > 0 && (
                            <InfoCard icon={<SeatingIcon />} label="Oturma" labelId="hk-oturma">
                                <span className={factValue}>{site.regions.map(r => r.name).join(', ')}</span>
                                {hasVenue && <Link to="/mekan" className={cardLink}>Mekânı gör →</Link>}
                            </InfoCard>
                        )}
                    </section>
                )}

                {canReserve && (
                    <section aria-labelledby="hk-rez" className={cn(siteCardDark, 'flex flex-wrap items-center justify-between gap-5 p-6 md:rounded-[24px] md:px-11 md:py-10')}>
                        <div className="flex min-w-0 flex-col gap-2">
                            <h2 id="hk-rez" className={cn(serif, 'm-0 text-[34px] leading-none md:text-[48px]')}>Masanızı <span className="italic">ayırtın.</span></h2>
                            <p className="m-0 text-[15px] text-[#BDBDBD]">Birkaç adımda masanızı seçin, onay bize kalsın.</p>
                        </div>
                        <Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'h-[52px] w-full px-[30px] text-base sm:w-auto md:h-14')}>Masa ayırt</Link>
                    </section>
                )}
            </main>
        </SitePage>
    );
}
