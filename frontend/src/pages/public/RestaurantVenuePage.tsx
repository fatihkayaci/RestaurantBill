import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { HoursTable, PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { RESERVATION_PATH, eyebrow, hasVenuePage, instagramHandle, line, moreArrow, moreLink, serif } from './site/siteParts';
import { hoursText, restaurantName, useSite } from './site/useSite';

const GALLERY = 6;

// /mekan: restoranın mekân başlığı ve alt yazısı, mekân fotoğrafı, menüden kareler, oturma bölümleri (masa sayısıyla)
// ve çalışma saatleri. Mekân bilgisi girilmemişse kısa bir "henüz eklenmedi" sayfası.
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
    const hasHours = Boolean(hoursText(site));
    const canReserve = canReserveOnline(site);

    return (
        <SitePage site={site} current="mekan">
            <PageHero site={site} label={`Mekân · ${name}`} title={content.headline || 'Mekân'} image={content.aboutImageUrl || undefined}>
                {content.tagline && <p className="m-0 max-w-[44ch] text-lg text-white/90 md:text-xl">{content.tagline}</p>}
            </PageHero>
            <main className="flex-1">
                {gallery.length >= 3 && (
                    <section aria-label="Menüden kareler" className="mx-auto max-w-[1344px] px-5 py-20 md:px-12 md:py-[110px]">
                        <div className="flex flex-col gap-6">
                            <span className={eyebrow}>Menüden kareler</span>
                            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                                {gallery.map(p => (
                                    <Link key={p.id} to="/menu" className="group block overflow-hidden rounded">
                                        <img src={p.imageUrl} alt={p.name} loading="lazy"
                                            className="block aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none" />
                                    </Link>
                                ))}
                            </div>
                            {content.instagramUrl && (
                                <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" className={moreLink}>
                                    {instagramHandle(content.instagramUrl)} <span aria-hidden="true" className={moreArrow}>→</span>
                                </a>
                            )}
                        </div>
                    </section>
                )}

                {(site.regions.length > 0 || hasHours) && (
                    <section className={cn('border-t bg-white', line)}>
                        <div className="mx-auto flex max-w-[1344px] flex-wrap gap-16 px-5 py-20 md:px-12 md:py-[110px]">
                            {site.regions.length > 0 && (
                                <div className="flex min-w-0 flex-[1.2_1_420px] flex-col gap-6">
                                    <span className={eyebrow}>Oturma</span>
                                    <ul className="m-0 flex list-none flex-col p-0">
                                        {site.regions.map(region => (
                                            <li key={region.id} className={cn('flex items-baseline justify-between gap-4 border-t py-4', line)}>
                                                <span className={cn(serif, 'text-[34px] leading-none md:text-[44px]')}>{region.name}</span>
                                                {region.tables.length > 0 && <span className="shrink-0 text-sm text-[#6F6A63]">{region.tables.length} masa</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
                                {hasHours && (
                                    <>
                                        <span className={eyebrow}>Çalışma saatleri</span>
                                        <HoursTable site={site} />
                                    </>
                                )}
                                {canReserve && (
                                    <Link to={RESERVATION_PATH} className="flex h-14 items-center self-start rounded-full bg-[var(--site-accent)] px-[30px] font-semibold text-[var(--site-on-accent)]">
                                        Masa ayırt
                                    </Link>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </SitePage>
    );
}
