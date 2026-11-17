import { useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from './components/StockImageLabel';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { ClockIcon, DirectionsIcon, HeroStatusPill, HoursBlock, InfoCard, InstagramIcon, MapStub, OpenBadge } from './site/SiteCards';
import {
    RESERVATION_PATH, amenityLabel, cardButton, cardLabel, eyebrow, hasVenuePage, instagramHandle, serif, siteCard, siteCardDark, siteCardLg,
} from './site/siteParts';
import { directionsUrl } from './site/siteTheme';
import { fullAddress, restaurantName, useSite } from './site/useSite';
import { EditableBlock, EditableText, EmptySlot, ExternalHint } from './site/siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from './site/siteEditContext';

// /mekan (Öneri A; mekân fotoğrafı yoksa kendiliğinden C). Fotoğraf sırası: mekân fotoğrafları → hikâye ve kapak
// fotoğrafı → menü fotoğrafları ("Menümüzden" başlığıyla, ayrı). Galeri büyük + küçük karelerden mozaik; bölümler
// fotoğraf, masa sayısı ve açıklamasıyla ayrı kartlar; olanaklar çip. Hiç mekân fotoğrafı yoksa harita, restoranın
// kendi sözü ve "Nasıl gelinir" ile anlatılır. Girilmemiş bilgi gösterilmez.

const MOSAIC_SMALL = 4;

function venuePhotos(site: PublicSite): string[] {
    const c = site.site;
    return [...new Set([...c.galleryImageUrls, c.aboutImageUrl, c.coverImageUrl].filter(Boolean))];
}

/** Türkçe bulunma eki: "salon" → "salonda", "teras" → "terasta", "bahçe" → "bahçede" (son ünlü ve sert ünsüz uyumu). */
function locative(word: string): string {
    const lower = word.trim().toLocaleLowerCase('tr-TR');
    const vowel = [...lower].reverse().find(ch => 'aıoueiöü'.includes(ch));
    const a = vowel && 'eiöü'.includes(vowel) ? 'e' : 'a';
    const d = 'fstkçşhp'.includes(lower.slice(-1)) ? 't' : 'd';
    return `${lower}${d}${a}`;
}

/** "Salonda, avluda" + "ya da terasta." (en çok üç bölüm); tek bölümde null. */
function regionPhrase(names: string[]): { head: string; tail: string } | null {
    if (names.length < 2) return null;
    const locs = names.slice(0, 3).map(locative);
    const head = locs.slice(0, -1).join(', ');
    return { head: head.charAt(0).toLocaleUpperCase('tr-TR') + head.slice(1), tail: `ya da ${locs[locs.length - 1]}.` };
}

/** "Salonda mı, avluda mı?" */
function choiceQuestion(a: string, b: string): string {
    const q = (loc: string) => `${loc} ${loc.endsWith('e') ? 'mi' : 'mı'}`;
    const first = q(locative(a));
    return `${first.charAt(0).toLocaleUpperCase('tr-TR') + first.slice(1)}, ${q(locative(b))}?`;
}

/** Galerideki bir fotoğrafın düzenleyicideki hedefi: galeri karesi, hikâye fotoğrafı ya da kapak. */
function photoTarget(site: PublicSite, src: string): { target: string; label: string } {
    const c = site.site;
    const i = c.galleryImageUrls.indexOf(src);
    if (i >= 0) return { target: `gallery:${i}`, label: `Mekân fotoğrafı ${i + 1}` };
    if (src === c.aboutImageUrl) return { target: 'photo:about', label: 'Hikâye fotoğrafı' };
    return { target: 'photo:cover', label: 'Kapak fotoğrafı' };
}

/**
 * Mozaik galeri: ilk fotoğraf büyük, yanında en çok dört kare; fazlası "+N fotoğraf" ile açılır. Düzenleyicide hep açık
 * ızgara: her kare tıklanınca fotoğraf menüsü açılır, sonda "+ Fotoğraf ekle" karesi (en çok 12).
 */
function Gallery({ site, photos, title }: { site: PublicSite; photos: string[]; title: string }) {
    const edit = useSiteEdit();
    const [expanded, setExpanded] = useState(false);
    const shot = (src: string, i: number, className: string, lazy = true) => {
        const { target, label } = photoTarget(site, src);
        const t = editTarget(edit, target, label);
        return <img key={src} src={src} alt={`${title}, fotoğraf ${i + 1}`} loading={lazy ? 'lazy' : undefined} {...t} className={cn(className, t.className)} />;
    };
    if (edit || expanded || photos.length <= 2) {
        const canAdd = Boolean(edit) && site.site.galleryImageUrls.length < SITE_LIMITS.gallery;
        const cells = photos.length + (canAdd ? 1 : 0);
        return (
            <div className={cn('grid gap-2.5 md:gap-3', cells === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3')}>
                {photos.map((src, i) => shot(src, i, cn('block w-full rounded-[14px] object-cover md:rounded-[18px]', cells === 1 ? 'aspect-[16/9]' : 'aspect-square')))}
                {canAdd && (
                    <div data-edit-target="gallery:add"
                        className="flex aspect-square cursor-pointer items-center justify-center rounded-[14px] border border-dashed border-[#CFC5B4] font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E] hover:border-[#2B7FFF] hover:text-[#1E4FA0] md:rounded-[18px]">
                        + Fotoğraf ekle
                    </div>
                )}
            </div>
        );
    }
    const [big, ...rest] = photos;
    const small = rest.slice(0, MOSAIC_SMALL);
    const hidden = photos.length - 1 - small.length;
    const fourGrid = small.length >= 3;
    return (
        <div className={cn('grid grid-cols-2 gap-2.5 md:gap-3', fourGrid ? 'md:grid-cols-4 md:grid-rows-2' : 'md:grid-cols-3 md:grid-rows-2')}>
            {shot(big, 0, 'col-span-2 row-span-2 block aspect-[4/3] h-full w-full rounded-[14px] object-cover md:aspect-auto md:min-h-[440px] md:rounded-[18px]', false)}
            {small.map((src, i) => {
                const last = i === small.length - 1 && hidden > 0;
                return (
                    <div key={src} className={cn('relative overflow-hidden rounded-[14px] md:rounded-[18px]', !fourGrid && small.length === 1 && 'col-span-2 md:col-span-1 md:row-span-2')}>
                        {shot(src, i + 1, 'block aspect-square h-full w-full object-cover')}
                        {last && (
                            <button type="button" onClick={() => setExpanded(true)}
                                className="absolute inset-0 flex items-center justify-center bg-[rgba(20,16,12,0.55)] text-lg font-semibold text-white">
                                +{hidden} fotoğraf
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function RestaurantVenuePage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const content = site.site;
    const name = restaurantName(site);
    const showEmpty = Boolean(edit?.showEmpty);
    const igT = editTarget(edit, 'contact', 'Instagram');

    if (!hasVenuePage(site) && !showEmpty) {
        return (
            <SitePage site={site} current="mekan">
                <PageHero site={site} label={name} title="Mekân" image={content.venueHeroUrl} imageTarget="photo:hero-mekan" imageLabel="Mekân kapağı" />
                <PageEmpty text="Mekân bilgileri henüz eklenmedi." />
            </SitePage>
        );
    }

    const photos = venuePhotos(site);
    const hasPhotos = photos.length > 0;
    const menuPhotos = site.categories.flatMap(c => c.products).filter(p => p.imageUrl).slice(0, 6);
    const address = fullAddress(site);
    const canReserve = canReserveOnline(site);
    const hasHours = Boolean(content.weeklyHours.length || (content.opensAt && content.closesAt));
    const phrase = regionPhrase(site.regions.map(r => r.name));
    const amenities = content.amenities.map(amenityLabel).filter((a): a is string => !!a);
    const regionCols = site.regions.length + (canReserve && !edit ? 1 : 0);

    return (
        <SitePage site={site} current="mekan">
            <PageHero site={site} label={`Mekân · ${name}`} image={content.venueHeroUrl || content.galleryImageUrls[0] || content.aboutImageUrl || undefined}
                imageTarget="photo:hero-mekan" imageLabel="Mekân kapağı" 
                title={<EditableText field="headline" value={content.headline} fallback="Mekân" placeholder="Büyük başlık" />}
                compact titleClassName="text-[48px] leading-[0.98] md:text-[80px]" aside={<HeroStatusPill site={site} />}>
                {(content.tagline || showEmpty) && (
                    <EditableText as="p" field="tagline" value={content.tagline} placeholder="Alt başlık"
                        className="m-0 max-w-[60ch] text-base leading-normal text-white/90 md:text-[17px]" />
                )}
            </PageHero>
            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-4 px-5 pb-10 pt-5 md:gap-6 md:px-12 md:pb-16 md:pt-14">
                {!hasPhotos && showEmpty && (
                    <EmptySlot target="gallery:add" title="+ Fotoğraf ekle" />
                )}
                {hasPhotos ? (
                    <section aria-labelledby="mk-galeri" className={cn(siteCardLg, 'flex min-w-0 flex-col gap-5 p-4 md:gap-6 md:rounded-[28px] md:p-9')}>
                        <div className="flex flex-wrap items-end justify-between gap-4 px-1 pt-1 md:p-0">
                            <div className="flex min-w-0 flex-col gap-2">
                                <span className={eyebrow}>Mekânımız</span>
                                {!edit && (
                                    <h2 id="mk-galeri" className={cn(serif, 'm-0 text-[34px] leading-[1.05] md:text-[44px]')}>
                                        {phrase ? <>{phrase.head} <span className="italic">{phrase.tail}</span></> : <>Masamızdan <span className="italic">birkaç an.</span></>}
                                    </h2>
                                )}
                            </div>
                            {content.instagramUrl && (
                                <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer" {...igT} className={cn(cardButton.outline, 'self-auto [&>svg]:h-4 [&>svg]:w-4', igT.className)}>
                                    <InstagramIcon />
                                    {instagramHandle(content.instagramUrl)}
                                </a>
                            )}
                        </div>
                        <Gallery site={site} photos={photos} title={name} />
                    </section>
                ) : (
                    // Öneri C: fotoğrafsız mekân — harita, restoranın sözü ve nasıl gelinir.
                    <div className={cn('grid grid-cols-1 gap-4', address && content.tagline && !edit && 'lg:grid-cols-[1.2fr_1fr]')}>
                        {address && !edit && (
                            <section aria-labelledby="mk-adres" className={cn(siteCard, 'flex min-w-0 flex-col overflow-hidden')}>
                                <MapStub className="h-[160px] md:h-[220px]" />
                                <div className="flex flex-col gap-2.5 p-5 md:p-7">
                                    <h2 id="mk-adres" className={cn(cardLabel, 'm-0')}>Adres</h2>
                                    <span className={cn(serif, 'break-words text-[28px] leading-[1.05] md:text-[34px]')}>{address}</span>
                                    <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cardButton.dark}>
                                        <DirectionsIcon />Yol tarifi al
                                    </a>
                                </div>
                            </section>
                        )}
                        {content.tagline && (
                            <figure className={cn(siteCard, 'm-0 flex flex-col justify-center gap-3 p-6 md:p-10')}>
                                <blockquote className={cn(serif, 'm-0 text-[36px] italic leading-[1.05] md:text-[52px]')}>
                                    {edit ? <EditableText field="tagline" value={content.tagline} placeholder="Alt başlık" /> : <>“{content.tagline}”</>}
                                </blockquote>
                                <figcaption className="text-[15px] text-[var(--site-sub)]">{name}, kendini böyle anlatıyor.</figcaption>
                            </figure>
                        )}
                    </div>
                )}

                {/* Bölümler: fotoğraf, masa sayısı, açıklama; sonunda rezervasyon kartı */}
                {regionCols > 0 && site.regions.length > 0 && (
                    // Düzenleyicide bölümün adı yalnız tanımak için yazılır (Masalar'dan gelir); masa sayısı ve rezervasyon kartı yok.
                    <section aria-label="Oturma bölümleri" data-edit-reveal={edit ? 'list:regions' : undefined} className={cn('grid grid-cols-1 gap-4', regionCols >= 2 && 'md:grid-cols-2', regionCols >= 3 && 'lg:grid-cols-3')}>
                        {site.regions.map(region => {
                            const t = editTarget(edit, `region:${region.id}`, `Bölüm · ${region.name}`);
                            return (
                            <article key={region.id} {...t} className={cn(siteCard, 'flex min-w-0 flex-col overflow-hidden', t.className, t.className && 'outline-offset-4')}>
                                {region.photoUrl && <img src={region.photoUrl} alt={region.name} loading="lazy" className="block aspect-[16/10] w-full object-cover" />}
                                {!region.photoUrl && showEmpty && (
                                    <div className="flex aspect-[16/10] items-center justify-center border-b border-dashed border-[#CFC5B4] font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E]">
                                        + Fotoğraf ekle
                                    </div>
                                )}
                                <div className="flex flex-1 flex-col gap-2 p-5 md:p-6">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <h2 className={cn(serif, 'm-0 min-w-0 break-words text-[30px] leading-none md:text-[36px]')}>{region.name}</h2>
                                        {region.tables.length > 0 && !edit && <span className="shrink-0 text-sm font-semibold text-[var(--site-sub)]">{region.tables.length} masa</span>}
                                    </div>
                                    {(region.description || showEmpty) && (
                                        <EditableText as="p" field={`region:${region.id}`} value={region.description ?? ''} placeholder="Kısa açıklama"
                                            className="m-0 text-[15px] text-[var(--site-sub)]" />
                                    )}
                                </div>
                            </article>
                            );
                        })}
                        {canReserve && !edit && (
                            <section aria-labelledby="mk-rez" className={cn(siteCardDark, 'flex flex-col justify-between gap-5 p-6 md:p-7')}>
                                <h2 id="mk-rez" className={cn(serif, 'm-0 text-[30px] leading-[1.05] md:text-[36px]')}>
                                    {site.regions.length >= 2 ? <>{choiceQuestion(site.regions[0].name, site.regions[1].name)} <span className="italic">Siz seçin.</span></> : <>Masanızı <span className="italic">siz seçin.</span></>}
                                </h2>
                                <Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'h-12 w-full px-[22px] text-[15px] sm:w-auto')}>Masa ayırt</Link>
                            </section>
                        )}
                    </section>
                )}

                {(amenities.length > 0 || content.directionsNote || hasHours || showEmpty) && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
                        {amenities.length === 0 && showEmpty && <EmptySlot target="amenities" title="+ Olanak ekle" />}
                        {amenities.length > 0 && (
                            <section aria-labelledby="mk-olanak" {...editTarget(edit, 'amenities', 'Olanaklar')}
                                className={cn(siteCard, 'flex flex-col gap-3.5 p-5 md:p-6', editTarget(edit, 'amenities', 'Olanaklar').className)}>
                                <h2 id="mk-olanak" className={cn(cardLabel, 'm-0')}>Olanaklar</h2>
                                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                                    {amenities.map(a => (
                                        <li key={a} className="rounded-full border border-[var(--site-line)] px-3.5 py-2 text-sm font-semibold">{a}</li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {(content.directionsNote || showEmpty) && (
                            <InfoCard icon={<DirectionsIcon />} label="Nasıl gelinir" labelId="mk-yol"
                                action={address && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cardButton.outline}>Yol tarifi al</a>}>
                                <EditableText as="p" field="directionsNote" value={content.directionsNote} multiline placeholder="Nasıl gelinir?"
                                    className="m-0 whitespace-pre-line text-[15px] leading-relaxed" />
                            </InfoCard>
                        )}
                        {!hasHours && showEmpty && <EmptySlot target="hours" title="+ Saat ekle" />}
                        {hasHours && (
                            <EditableBlock target="hours" label="Çalışma saatleri" className="h-full rounded-[20px]">
                            <InfoCard icon={<ClockIcon />} label="Çalışma saatleri" labelId="mk-saat" className="h-full"
                                action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                                <HoursBlock site={site} compact weekHref="/iletisim#saatler" />
                                {content.hoursNote && <p className="m-0 text-sm text-[var(--site-sub)]">{content.hoursNote}</p>}
                            </InfoCard>
                            </EditableBlock>
                        )}
                    </div>
                )}

                {/* Menü fotoğrafları ayrı ve adıyla: mekân fotoğrafı azsa */}
                {photos.length < 3 && menuPhotos.length >= 3 && (
                    <ExternalHint source="menu">
                    <section aria-labelledby="mk-menuden" className={cn(siteCard, 'flex flex-col gap-4 p-4 md:p-7')}>
                        <div className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1 md:p-0">
                            <h2 id="mk-menuden" className={cn(serif, 'm-0 text-[30px] leading-none md:text-[36px]')}>Menümüzden</h2>
                            <Link to="/menu" className="text-sm font-semibold underline underline-offset-4">Menüyü gör →</Link>
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
                            {menuPhotos.slice(0, menuPhotos.length >= 6 ? 6 : 3).map(p => (
                                <Link key={p.id} to="/menu" className="relative block overflow-hidden rounded-[12px]">
                                    <img src={p.imageUrl} alt={p.name} loading="lazy" className="block aspect-square w-full object-cover" />
                                    {p.isStockImage && <StockImageLabel />}
                                </Link>
                            ))}
                        </div>
                    </section>
                    </ExternalHint>
                )}
            </main>
        </SitePage>
    );
}
