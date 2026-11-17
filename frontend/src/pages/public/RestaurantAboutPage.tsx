import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from './components/StockImageLabel';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageEmpty, PageHero, SitePage } from './site/SiteFrame';
import { collagePhotos, pickFeatured } from './site/siteMedia';
import { HeroStatusPill, InfoCard, MapPinIcon } from './site/SiteCards';
import { MenuProductCard } from './site/SiteProductCards';
import {
    RESERVATION_PATH, cardButton, cardLink, eyebrow, hasAboutPage, hasVenuePage, productCount, serif, siteCard, siteCardDark, siteCardLg, sinceYear,
} from './site/siteParts';
import { directionsUrl } from './site/siteTheme';
import { averageOpenHours, fullAddress, hoursLine, isUniformWeek, restaurantName, useSite } from './site/useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from './site/siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from './site/siteEditContext';

// /hakkimizda (Öneri A, usta bilgisi girildiyse B). Hikâye kartının sağ yarısı asla boş kalmaz: hikâye fotoğrafı
// yoksa menüdeki fotoğraflardan 2×2 kolaj. Usta/kurucu girildiyse fotoğrafı ve sözüyle kart; değerler (en çok 3) kart
// olarak; "rakamlarla" satırı mevcut veriden hesaplanır (3'ün altındaki değerler gizli); kilometre taşları zaman
// çizelgesi; "İmza tabaklarımız"; ziyaret ve rezervasyon kartları. Yazı hiç yoksa: "Bizi menümüzden tanıyın."

const MIN_STAT = 3;

interface Stat { value: string; unit?: string; text: string }

function stats(site: PublicSite): Stat[] {
    const out: Stat[] = [];
    const products = site.categories.flatMap(c => c.products);
    if (products.length >= MIN_STAT) {
        out.push({ value: String(products.length), text: `ürün, ${site.categories.length} kategoride` });
    }
    const tables = site.regions.reduce((sum, r) => sum + r.tables.length, 0);
    if (tables >= MIN_STAT) out.push({ value: String(tables), text: `masa · ${site.regions.map(r => r.name).join(', ')}` });
    const hours = averageOpenHours(site);
    if (hours !== null && hours >= MIN_STAT) {
        out.push({ value: hours.toLocaleString('tr-TR'), text: isUniformWeek(site) ? 'saat açık, her gün' : 'saat açık, günde ortalama' });
    }
    const preps = products.map(p => p.prepMinutes).filter((m): m is number => !!m);
    if (preps.length >= MIN_STAT) {
        out.push({ value: `~${Math.round(preps.reduce((a, b) => a + b, 0) / preps.length)}`, unit: 'dk', text: 'ortalama hazırlık' });
    }
    return out;
}

/** Hikâye kartının görsel yarısı: hikâye fotoğrafı ya da menüden 2×2 kolaj (en az 2 fotoğraf); yoksa hiç. */
function StoryVisual({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const target = editTarget(edit, 'photo:about', 'Hikâye fotoğrafı');
    const image = site.site.aboutImageUrl;
    if (image) {
        return (
            <div {...target} className={cn('relative order-1 min-w-0 overflow-hidden lg:order-2 lg:min-h-[480px]', target.className)}>
                <img src={image} alt="" className="block aspect-[4/3] w-full object-cover md:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto lg:h-full" />
            </div>
        );
    }
    const photos = collagePhotos(site, 4);
    if (photos.length < 2) {
        if (!edit?.showEmpty) return null;
        return (
            <div className="order-1 flex min-h-[220px] min-w-0 p-3 lg:order-2 lg:min-h-[480px]">
                <EmptySlot target="photo:about" title="+ Fotoğraf ekle" className="flex-1" />
            </div>
        );
    }
    const four = photos.length >= 4 ? photos.slice(0, 4) : photos.slice(0, 2);
    return (
        <div aria-hidden="true" {...target} className={cn('order-1 grid min-w-0 gap-1.5 p-1.5 lg:order-2 lg:min-h-[480px]', four.length === 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2', target.className)}>
            {four.map((p, i) => (
                <div key={i} className="relative min-h-[130px] overflow-hidden rounded-[14px]">
                    <img src={p.url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    {p.isStock && <StockImageLabel />}
                </div>
            ))}
        </div>
    );
}

export default function RestaurantAboutPage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    if (!site) return <SiteShell><SiteStatus error={error} /></SiteShell>;

    const content = site.site;
    const name = restaurantName(site);
    const showEmpty = Boolean(edit?.showEmpty);

    if (!hasAboutPage(site) && !showEmpty) {
        return (
            <SitePage site={site} current="hakkimizda">
                <PageHero site={site} label={name} title="Hakkımızda" image={content.aboutHeroUrl} imageTarget="photo:hero-hakkimizda" imageLabel="Hakkımızda kapağı" />
                <PageEmpty text="Hakkımızda yazısı henüz eklenmedi." />
            </SitePage>
        );
    }

    const address = fullAddress(site);
    const hasStory = Boolean(content.storyTitle || content.about) || showEmpty;
    const hasVenue = hasVenuePage(site);
    const canReserve = canReserveOnline(site);
    const since = content.foundedYear ? sinceYear(content.foundedYear) : null;
    const facts = stats(site);
    const signature = productCount(site) >= 2 ? pickFeatured(site.categories.flatMap(c => c.products), 3, true) : [];
    const milestones = content.milestones;
    const valueCells = content.values.length + (edit && content.values.length < SITE_LIMITS.value.max ? 1 : 0);
    const milestoneCells = milestones.length + (edit && milestones.length < SITE_LIMITS.milestone.max ? 1 : 0);

    return (
        <SitePage site={site} current="hakkimizda">
            <PageHero site={site} label={[name, since].filter(Boolean).join(' · ')} title="Hakkımızda" compact aside={<HeroStatusPill site={site} />}
                image={content.aboutHeroUrl} imageTarget="photo:hero-hakkimizda" imageLabel="Hakkımızda kapağı" />
            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-4 px-5 pb-10 pt-5 md:gap-6 md:px-12 md:pb-16 md:pt-14">
                {/* Hikâye (ya da yazı yoksa menüden tanıtım) ve görsel yarısı */}
                <section aria-labelledby="hk-hikaye" className={cn(siteCardLg, 'grid grid-cols-1 overflow-hidden md:rounded-[28px] lg:grid-cols-2')}>
                    <div className="order-2 flex min-w-0 flex-col justify-center gap-4 p-6 md:gap-[22px] md:p-14 lg:order-1">
                        {hasStory ? (
                            <>
                                <EditableBlock target="year" label="Kuruluş yılı" className="self-start">
                                    <span className={eyebrow}>{since ? `Hikâyemiz · ${since}` : 'Hikâyemiz'}</span>
                                </EditableBlock>
                                {(content.storyTitle || showEmpty) && (
                                    <EditableText as="h2" id="hk-hikaye" field="storyTitle" value={content.storyTitle}
                                        placeholder="Slogan yazın"
                                        className={cn(serif, 'm-0 break-words text-[40px] leading-[1.02] md:text-[60px]')} />
                                )}
                                {!content.storyTitle && !showEmpty && <h2 id="hk-hikaye" className="sr-only">Hikâyemiz</h2>}
                                {(content.about || showEmpty) && (
                                    <EditableText as="p" field="about" value={content.about} multiline
                                        placeholder="Kısa hikâyenizi yazın"
                                        className="m-0 max-w-[60ch] whitespace-pre-line text-base leading-[1.6] text-[var(--site-sub)] md:text-[17px]" />
                                )}
                            </>
                        ) : (
                            <>
                                <span className={eyebrow}>{name}</span>
                                <h2 id="hk-hikaye" className={cn(serif, 'm-0 text-[40px] leading-[1.02] md:text-[60px]')}>Bizi <span className="italic">menümüzden</span> tanıyın.</h2>
                                {(site.district || site.openAddress || hoursLine(site)) && (
                                    <p className="m-0 text-base leading-[1.6] text-[var(--site-sub)] md:text-[17px]">
                                        {[[site.district, site.openAddress].filter(Boolean).join(', '), hoursLine(site)].filter(Boolean).join('. ')}.
                                    </p>
                                )}
                            </>
                        )}
                        {!edit && <div className="flex flex-wrap gap-2.5 pt-1">
                            <Link to="/menu" className={cn(cardButton.accent, 'h-12 px-[22px] text-[15px]')}>{hasStory ? 'Menüye göz atın' : 'Menüyü gör'}</Link>
                            {hasVenue && <Link to="/mekan" className={cn(cardButton.outline, 'h-12 px-[22px] text-[15px]')}>Mekânı görün</Link>}
                        </div>}
                    </div>
                    <StoryVisual site={site} />
                </section>

                {/* Usta / kurucu (Öneri B) */}
                {(content.founderName || showEmpty) && (
                    <section aria-labelledby="hk-usta" className={cn(siteCardLg, 'grid grid-cols-1 overflow-hidden md:rounded-[28px]', (content.founderPhotoUrl || showEmpty) && 'md:grid-cols-[minmax(0,360px)_1fr]')}>
                        {content.founderPhotoUrl ? (
                            <img src={content.founderPhotoUrl} alt={content.founderName} loading="lazy" {...editTarget(edit, 'photo:founder', 'Usta portresi')}
                                className={cn('block aspect-[4/5] max-h-[420px] w-full object-cover md:max-h-none md:h-full', editTarget(edit, 'photo:founder', 'Usta portresi').className)} />
                        ) : showEmpty && (
                            <div className="flex min-h-[260px] p-3"><EmptySlot target="photo:founder" title="+ Portre ekle" className="flex-1" /></div>
                        )}
                        <figure className="m-0 flex min-w-0 flex-col justify-center gap-5 p-6 md:p-12">
                            {since && <span className={eyebrow}>{[since, site.district].filter(Boolean).join(' · ')}</span>}
                            {(content.founderQuote || showEmpty) && (
                                <blockquote className={cn(serif, 'm-0 text-[30px] leading-[1.12] md:text-[44px]')}>
                                    {edit ? (
                                        <EditableText field="founderQuote" value={content.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />
                                    ) : <>“{content.founderQuote}”</>}
                                </blockquote>
                            )}
                            <figcaption className="flex flex-col gap-0.5">
                                <EditableText id="hk-usta" field="founderName" value={content.founderName} placeholder="Ustanın adı" className="text-lg font-bold" />
                                {(content.founderTitle || showEmpty) && (
                                    <EditableText field="founderTitle" value={content.founderTitle} placeholder="Unvanı" className="text-[15px] text-[var(--site-sub)]" />
                                )}
                            </figcaption>
                        </figure>
                    </section>
                )}

                {/* Değerler (Öneri B) */}
                {(content.values.length > 0 || showEmpty) && (
                    <section aria-label="Değerlerimiz" className={cn('grid grid-cols-1 gap-4', valueCells === 2 && 'md:grid-cols-2', valueCells >= 3 && 'md:grid-cols-3')}>
                        {content.values.map((v, i) => (
                            <ListCard key={i} list="values" index={i} count={content.values.length} label="Değer" className="flex">
                                <div className={cn(siteCard, 'flex flex-1 flex-col gap-2 p-6')}>
                                    <span aria-hidden="true" className="text-[var(--site-accent-text)]">✦</span>
                                    <EditableText as="h2" field={`value:${i}:title`} value={v.title} placeholder="Başlık"
                                        className={cn(serif, 'm-0 text-[28px] leading-[1.05] md:text-[32px]')} />
                                    {(v.text || edit) && (
                                        <EditableText as="p" field={`value:${i}:text`} value={v.text} placeholder="Tek cümle"
                                            className="m-0 text-[15px] text-[var(--site-sub)]" />
                                    )}
                                </div>
                            </ListCard>
                        ))}
                        <AddCard list="values" label="Değer ekle" count={content.values.length} max={SITE_LIMITS.value.max} />
                    </section>
                )}

                {/* Rakamlarla (mevcut veriden) */}
                {facts.length >= 2 && (
                    <ExternalHint source="auto" className="rounded-[20px]">
                    <section aria-labelledby="hk-rakam" className={cn(siteCard, 'flex flex-col gap-5 p-6 md:p-8')}>
                        <h2 id="hk-rakam" className={cn(eyebrow, 'm-0')}>Menümüzden rakamlarla</h2>
                        <dl className={cn('m-0 grid grid-cols-2 gap-x-6 gap-y-5', facts.length >= 3 && 'md:grid-cols-3', facts.length >= 4 && 'lg:grid-cols-4')}>
                            {facts.map(f => (
                                <div key={f.text} className="flex min-w-0 flex-col gap-1 border-t border-[var(--site-border)] pt-3">
                                    <dt className="order-2 text-sm text-[var(--site-sub)]">{f.text}</dt>
                                    <dd className={cn(serif, 'order-1 m-0 text-[44px] leading-none md:text-[56px]')}>
                                        {f.value}{f.unit && <span className="ml-1 text-[0.45em]">{f.unit}</span>}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                    </ExternalHint>
                )}

                {/* Zaman çizelgesi (Öneri C; en az 2 satır) */}
                {(milestones.length >= 2 || (edit && (milestones.length > 0 || showEmpty))) && (
                    <section aria-labelledby="hk-yillar" className={cn(siteCard, 'flex flex-col gap-6 p-6 md:p-9')}>
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h2 id="hk-yillar" className={cn(serif, 'm-0 text-[36px] leading-none md:text-[44px]')}>Yıllar <span className="italic">içinde.</span></h2>
                            {milestones.length > 0 && <span className="text-sm tabular-nums text-[var(--site-muted)]">{milestones[0].year} — {new Date().getFullYear()}</span>}
                        </div>
                        {edit && milestones.length < 2 && (
                            <p className="m-0 font-[family-name:'DM_Sans',system-ui,sans-serif] text-sm text-[#7A4E0E]">En az 2 olunca görünür.</p>
                        )}
                        <ol className={cn('m-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2', milestoneCells >= 4 ? 'lg:grid-cols-4' : milestoneCells === 3 && 'lg:grid-cols-3')}>
                            {milestones.map((m, i) => (
                                <li key={i}>
                                    <ListCard list="milestones" index={i} count={milestones.length} label="Kilometre taşı" className="h-full rounded-none">
                                        <div className="flex h-full flex-col gap-1.5 border-t-2 border-[var(--site-accent)] pt-3">
                                            <EditableText field={`milestone:${i}:year`} value={m.year ? String(m.year) : ''} placeholder="Yıl"
                                                className={cn(serif, 'text-[32px] leading-none tabular-nums')} />
                                            <EditableText field={`milestone:${i}:text`} value={m.text} placeholder="Ne oldu?" className="text-[15px] text-[var(--site-sub)]" />
                                        </div>
                                    </ListCard>
                                </li>
                            ))}
                            {edit && milestones.length < SITE_LIMITS.milestone.max && (
                                <li><AddCard list="milestones" label="Kilometre taşı ekle" count={milestones.length} max={SITE_LIMITS.milestone.max} /></li>
                            )}
                        </ol>
                    </section>
                )}

                {/* İmza tabaklar */}
                {signature.length >= 2 && (
                    <ExternalHint source="menu">
                    <section aria-labelledby="hk-imza" className="flex flex-col gap-4 pt-2">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <h2 id="hk-imza" className={cn(serif, 'm-0 text-[36px] leading-none md:text-[48px]')}>İmza <span className="italic">tabaklarımız.</span></h2>
                            <Link to="/menu" className={cardLink}>Tüm menü →</Link>
                        </div>
                        <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5', signature.length >= 3 && 'lg:grid-cols-3')}>
                            {signature.map(p => <MenuProductCard key={p.id} product={p} />)}
                        </div>
                    </section>
                    </ExternalHint>
                )}

                {(address || canReserve) && !edit && (
                    <div className={cn('grid grid-cols-1 gap-4', address && canReserve && 'md:grid-cols-2')}>
                        {address && (
                            <ExternalHint source="restaurant" className="h-full">
                                <InfoCard icon={<MapPinIcon />} label="Bizi ziyaret edin" labelId="hk-konum" className="h-full"
                                    action={<a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={cardButton.dark}>Yol tarifi al</a>}>
                                    <span className={cn(serif, 'break-words text-[26px] leading-[1.05] md:text-[30px]')}>{address}</span>
                                </InfoCard>
                            </ExternalHint>
                        )}
                        {canReserve && (
                            <section aria-labelledby="hk-rez" className={cn(siteCardDark, 'flex flex-wrap items-center justify-between gap-5 p-6 md:rounded-[24px] md:px-9 md:py-8')}>
                                <div className="flex min-w-0 flex-col gap-2">
                                    <h2 id="hk-rez" className={cn(serif, 'm-0 text-[34px] leading-none md:text-[44px]')}>Masanızı <span className="italic">ayırtın.</span></h2>
                                    <p className="m-0 text-[15px] text-[var(--site-on-paper-sub)]">Birkaç adımda masanızı seçin, onay bize kalsın.</p>
                                </div>
                                <Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'h-[52px] w-full px-[30px] text-base sm:w-auto')}>Masa ayırt</Link>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </SitePage>
    );
}
