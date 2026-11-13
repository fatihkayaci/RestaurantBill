import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, eyebrow, hasAboutPage, hasVenuePage, line, moreArrow, moreLink, serif } from './site/siteParts';
import { hoursText, restaurantName, useSite } from './site/useSite';

// /hakkimizda: restoranın "Hakkımızda" başlığı ve yazısı, hikâye fotoğrafı ve gerçek verilerden kısa bilgiler
// (konum, saatler, menü, oturma bölümleri). Yazı girilmemişse kısa bir "henüz eklenmedi" sayfası.
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
    const hours = hoursText(site);
    const productCount = site.categories.reduce((sum, c) => sum + c.products.length, 0);
    const facts = [
        location && { label: 'Konum', value: location },
        hours && { label: 'Çalışma saatleri', value: `Her gün ${hours}` },
        productCount > 0 && { label: 'Menü', value: `${site.categories.length} kategori · ${productCount} ürün` },
        site.regions.length > 0 && { label: 'Oturma', value: site.regions.map(r => r.name).join(', ') },
    ].filter((f): f is { label: string; value: string } => Boolean(f));

    return (
        <SitePage site={site} current="hakkimizda">
            <PageHero site={site} label={name} title="Hakkımızda" />
            <main className="flex-1">
                <section className="mx-auto flex max-w-[1344px] flex-wrap items-start gap-16 px-5 py-20 md:px-12 md:py-[120px]">
                    <div className="flex min-w-0 flex-[1.3_1_520px] flex-col gap-8">
                        {content.storyTitle && (
                            <h2 className={cn(serif, 'm-0 text-[48px] leading-[0.98] tracking-[-0.025em] sm:text-[72px] lg:text-[96px]')}>{content.storyTitle}</h2>
                        )}
                        {content.about && <p className="m-0 max-w-[60ch] whitespace-pre-line text-[19px] text-[#4A4640]">{content.about}</p>}
                        <div className="flex flex-wrap gap-x-8 gap-y-4 pt-2">
                            <Link to="/menu" className={moreLink}>Menüye göz atın <span aria-hidden="true" className={moreArrow}>→</span></Link>
                            {hasVenuePage(site) && <Link to="/mekan" className={moreLink}>Mekân <span aria-hidden="true" className={moreArrow}>→</span></Link>}
                            {canReserveOnline(site) && <Link to={RESERVATION_PATH} className={moreLink}>Masa ayırt <span aria-hidden="true" className={moreArrow}>→</span></Link>}
                        </div>
                    </div>
                    {content.aboutImageUrl && (
                        <div className="min-w-0 flex-[1_1_380px] overflow-hidden rounded">
                            <img src={content.aboutImageUrl} alt="" className="block aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.04] motion-reduce:transition-none" />
                        </div>
                    )}
                </section>

                {facts.length > 0 && (
                    <section aria-label="Kısa bilgiler" className={cn('border-t bg-white', line)}>
                        <dl className="mx-auto m-0 grid max-w-[1344px] grid-cols-1 gap-x-12 gap-y-8 px-5 py-16 sm:grid-cols-2 md:px-12 lg:grid-cols-4">
                            {facts.map(f => (
                                <div key={f.label} className="flex min-w-0 flex-col gap-2">
                                    <dt className={eyebrow}>{f.label}</dt>
                                    <dd className={cn(serif, 'm-0 break-words text-[26px] leading-[1.15]')}>{f.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}
            </main>
        </SitePage>
    );
}
