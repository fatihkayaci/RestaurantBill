import type { CSSProperties, ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { canReserveOnline, type PublicProduct, type PublicSite, type ReservationRules } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { cn } from '@/lib/utils';
import { useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { StockImageLabel } from './components/StockImageLabel';
import { MyReservations, SiteShell, SiteStatus } from './site/SiteChrome';
import { HeaderSpacer, HeroBackdrop, SitePage } from './site/SiteFrame';
import { collagePhotos, pickFeatured } from './site/siteMedia';
import {
    ClockIcon, CupIcon, HeroStatusPill, HoursBlock, InfoCard, InstagramIcon, MapStub, OpenBadge, PhoneIcon, Stars,
} from './site/SiteCards';
import { FeaturedBadge, MenuProductCard } from './site/SiteProductCards';
import { SlotsSummary } from './site/SiteSetMenus';
import { productPhotos, savingLabel, setMenuImage } from './site/setMenuParts';
import {
    LG_SPAN, RESERVATION_PATH, cardButton, cardLabel, cardLink, eyebrow, formatRating, glassButton, heroAccentButton, instagramHandle,
    packRow, reservationHref, serif, siteCard, siteCardDark, sinceYear,
} from './site/siteParts';
import { directionsUrl, formatSitePrice, telHref } from './site/siteTheme';
import { fullAddress, restaurantName, useMyReservations, useSite } from './site/useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from './site/siteEdit';
import { SITE_LIMITS, editTarget, useSiteEdit } from './site/siteEditContext';

// Restoranın müşteriye açık ana sayfası (tasarım: canvas "Site Sayfaları" · Ana sayfa Öneri B "kart vitrin" + A'nın
// kolaj kapak kuralı). Kısa kapak (fotoğraf yoksa menü fotoğraflarından kolaj, o da yoksa kategori deseni) ve ilk ekranda
// saat, konum ve eylemler (Masa ayırt, Paket sipariş, Yol tarifi). Altında bento ızgara: öne çıkan tabak, saat, konum,
// rezervasyon/paket sipariş, puan, hikâye, hazır menü, menü ve Instagram kartları. Her kart bir alana bağlı: alan boşsa
// kart çizilmez ve ızgara kalan kartlarla kapanır (az veride boşluk değil, daha az kart). Restoranın girmediği veri uydurulmaz.

// Eski rezervasyon adresi (/?bolum=rezervasyon&tarih&saat&kisi) artık /rezervasyon sayfasına yönlenir.
const LEGACY_VIEW_PARAM = 'bolum';
/** Menü kartı bu kadar ürüne kadar ürünleri tek tek listeler; fazlasında kategori çipleri ve "Menüden seçmeler". */
const LIST_ALL_PRODUCTS = 8;

// Dev isim: uzun adlar ekrana sığsın diye harf sayısına göre küçülür (italik serif ≈ 0,42em/harf).
function fitName(name: string, maxPx: number, widthVw = 88): CSSProperties {
    const vw = widthVw / (Math.max(3, name.length) * 0.42);
    return { fontSize: `min(${maxPx}px, ${vw.toFixed(2)}vw)` };
}

function localIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

/** Bugünün en yakın üç rezervasyon başlangıcı (en az 30 dk sonrası); bugün kapalıysa ya da saat geçtiyse boş. */
function nextSlots(rules: ReservationRules, now = new Date()): string[] {
    const day = rules.days.find(d => d.day === now.getDay());
    if (!day?.isOpen) return [];
    const earliest = now.getHours() * 60 + now.getMinutes() + 30;
    const out: string[] = [];
    for (let t = toMinutes(day.firstStart); t <= toMinutes(day.lastStart) && out.length < 3; t += rules.slotIntervalMinutes) {
        if (t >= earliest) out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    }
    return out;
}

interface BentoCard { key: string; span: number; node: ReactNode; dark?: boolean; mobileFull?: boolean }

export default function RestaurantSitePage() {
    const { site, error } = useSite();
    const { mine } = useMyReservations();
    const [params] = useSearchParams();
    const canOrder = useOnlineOrderingAvailable();

    if (params.get(LEGACY_VIEW_PARAM) === 'rezervasyon') {
        const next = new URLSearchParams(params);
        next.delete(LEGACY_VIEW_PARAM);
        const query = next.toString();
        return <Navigate to={query ? `${RESERVATION_PATH}?${query}` : RESERVATION_PATH} replace />;
    }

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }

    return (
        <SitePage site={site} current="home">
            <HomeHero site={site} canOrder={canOrder} />
            <main className="flex flex-1 flex-col">
                <HomeBento site={site} canOrder={canOrder} />
                <HomePicks site={site} />
                <HomeReviews site={site} />
                {mine.length > 0 && (
                    <section className="mx-auto w-full max-w-[1344px] px-5 pb-10 md:px-12">
                        <div className={cn(siteCard, 'p-5 md:p-7')}><MyReservations items={mine} /></div>
                    </section>
                )}
                <PhotoStrip site={site} />
            </main>
        </SitePage>
    );
}

// ── Kapak ────────────────────────────────────────────────────────────────────────────────────────

function HomeHero({ site, canOrder }: { site: PublicSite; canOrder: boolean }) {
    const edit = useSiteEdit();
    const name = restaurantName(site);
    const content = site.site;
    const canReserve = canReserveOnline(site);
    const location = [site.district, site.city].filter(Boolean).join(', ');
    const eyebrowLine = [site.categories[0]?.name, location, content.foundedYear ? sinceYear(content.foundedYear) : null].filter(Boolean).join(' · ');
    const lead = content.tagline || content.headline;
    const hasPhotos = Boolean(content.coverImageUrl) || collagePhotos(site, 1).length > 0;

    // İlk ekranın eylemleri: ana düğme vurgu renginde, diğerleri cam. Rezervasyon > paket sipariş > menü.
    const actions: { key: string; label: string; to?: string; href?: string }[] = [];
    if (canReserve) actions.push({ key: 'rez', label: 'Masa ayırt', to: RESERVATION_PATH });
    if (canOrder) actions.push({ key: 'paket', label: 'Paket sipariş', to: '/siparis' });
    actions.push({ key: 'menu', label: 'Menüyü gör', to: '/menu' });
    if (actions.length < 3 && site.phone) actions.push({ key: 'ara', label: 'Ara', href: telHref(site.phone) });

    return (
        <EditableBlock target="photo:cover" label="Kapak fotoğrafı" chip="Fotoğrafı değiştir" className="outline-offset-[-4px]">
        <section id="ust" className={cn('relative flex flex-col overflow-hidden bg-[var(--site-hero)] text-white',
            hasPhotos ? 'min-h-[520px] md:min-h-[560px]' : 'min-h-[440px] md:min-h-[480px]')}>
            <HeroBackdrop site={site} image={content.coverImageUrl || undefined}
                overlay="bg-[linear-gradient(180deg,rgba(20,16,12,0.55),rgba(20,16,12,0.3)_45%,rgba(20,16,12,0.78))]" />
            <HeaderSpacer />
            {edit && !content.coverImageUrl && (
                <span className="relative mx-auto mt-4 rounded-full border border-dashed border-white/60 bg-black/25 px-4 py-2 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold">
                    + Kapak fotoğrafı ekle
                </span>
            )}
            <div className="relative mx-auto flex w-full max-w-[1344px] flex-1 flex-col justify-end gap-6 px-5 pb-7 md:flex-row md:items-end md:justify-between md:gap-8 md:px-12 md:pb-14">
                <div className="flex min-w-0 max-w-[820px] flex-col gap-3 md:gap-4">
                    {eyebrowLine && !edit && <span className="text-[11px] font-medium uppercase tracking-[0.28em] md:text-xs">{eyebrowLine}</span>}
                    {/* Ad Ayarlar'dan gelir; kapak adsız boş görünmesin diye düzenleyicide de yazılır (tıklanmaz). */}
                    <h1 className={cn(serif, 'm-0 max-w-full break-words italic leading-[0.88] tracking-[-0.03em]')} style={fitName(name, 168)}>{name}</h1>
                    {(lead || edit?.showEmpty) && (
                        <EditableText as="p" field="tagline" value={content.tagline} fallback={content.headline}
                            placeholder="Alt başlık yazın"
                            className="m-0 max-w-[52ch] text-base leading-normal text-white/90 md:text-[19px]" />
                    )}
                    <HeroStatusPill site={site} className="md:hidden" />
                    {!edit && (
                        <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap sm:gap-2.5 sm:pt-2">
                            {actions.map((a, i) => {
                                const cls = cn(i === 0 ? heroAccentButton : glassButton, 'px-4 sm:px-6', i >= 2 && 'hidden sm:inline-flex');
                                return a.to
                                    ? <Link key={a.key} to={a.to} className={cls}>{a.label}</Link>
                                    : <a key={a.key} href={a.href} className={cls}>{a.label}</a>;
                            })}
                        </div>
                    )}
                </div>
                <HeroStatusPill site={site} className="hidden md:inline-flex" />
            </div>
        </section>
        </EditableBlock>
    );
}

// ── Bento ızgara ─────────────────────────────────────────────────────────────────────────────────

function HomeBento({ site, canOrder }: { site: PublicSite; canOrder: boolean }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const content = site.site;
    const canReserve = canReserveOnline(site);
    const address = fullAddress(site);
    const products = site.categories.flatMap(c => c.products);
    // Düzenleyicide yalnız burada değişen kartlar: saat, puan, hikâye, Instagram (ürün, konum, rezervasyon… yok).
    const featured = edit ? undefined : pickFeatured(products, 1, true)[0];
    const hasHours = Boolean(content.weeklyHours.length || (content.opensAt && content.closesAt));
    const slots = canReserve ? nextSlots(site.reservation) : [];
    const today = localIsoDate(new Date());

    // Küçük kartlar (3/12): saat, konum, rezervasyon/paket (koyu), puan; dörde tamamlanmıyorsa telefon.
    const small: BentoCard[] = [];
    if (hasHours) {
        small.push({
            key: 'saat', span: 3, node: (
                <EditableBlock target="hours" label="Çalışma saatleri" className="h-full rounded-[20px]">
                    <InfoCard icon={<ClockIcon />} label="Çalışma saatleri" labelId="ev-saat" className="h-full"
                        action={site.isOpenNow !== null && <OpenBadge open={site.isOpenNow} />}>
                        <HoursBlock site={site} compact weekHref="/iletisim#saatler" valueClassName="text-[24px] md:text-[30px]" />
                        {content.hoursNote && <p className="m-0 text-sm text-[var(--site-sub)]">{content.hoursNote}</p>}
                    </InfoCard>
                </EditableBlock>
            ),
        });
    } else if (showEmpty) {
        small.push({ key: 'saat', span: 3, node: <EmptySlot target="hours" title="+ Saat ekle" /> });
    }
    if (address && !edit) {
        small.push({
            key: 'konum', span: 3, node: (
                <ExternalHint source="restaurant" className="h-full">
                <section aria-labelledby="ev-konum" className={cn(siteCard, 'flex h-full min-w-0 flex-col overflow-hidden')}>
                    <MapStub className="h-[72px] md:h-[110px]" />
                    <div className="flex flex-1 flex-col gap-2 p-4 md:px-6 md:pb-6">
                        <h2 id="ev-konum" className={cn(cardLabel, 'm-0')}>Konum</h2>
                        <span className={cn(serif, 'hidden text-[24px] leading-[1.05] md:block')}>{[site.openAddress, site.district].filter(Boolean).join(', ') || address}</span>
                        <span className={cn(serif, 'text-[22px] leading-none md:hidden')}>{site.district || site.city || address}</span>
                        <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer"
                            className={cn(cardButton.dark, 'mt-auto h-10 px-4 text-[13px] md:text-sm')}>Yol tarifi al</a>
                    </div>
                </section>
                </ExternalHint>
            ),
        });
    }
    if (canReserve && !edit) {
        const evening = slots[0] ? toMinutes(slots[0]) >= 17 * 60 : false;
        small.push({
            key: 'rez', span: 3, dark: true, node: (
                <ExternalHint source="reservation" className="h-full">
                <section aria-labelledby="ev-rez" className={cn(siteCardDark, 'flex h-full flex-col gap-3.5 p-5 md:p-6')}>
                    <h2 id="ev-rez" className={cn(cardLabel, 'm-0 text-[var(--site-on-paper-sub)]')}>{slots.length ? (evening ? 'Bu akşam' : 'Bugün') : 'Rezervasyon'}</h2>
                    <p className={cn(serif, 'm-0 text-[30px] leading-[1.05] md:text-[32px]')}>Masanızı <span className="italic">ayırtın.</span></p>
                    {slots.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {slots.map(time => (
                                <Link key={time} to={reservationHref({ date: today, time, partySize: 2 })}
                                    className="rounded-full border border-white/30 px-3 py-1.5 text-sm tabular-nums text-[var(--site-on-paper)] hover:bg-white/10">
                                    {time}
                                </Link>
                            ))}
                        </div>
                    )}
                    <Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'mt-auto')}>Masa ayırt</Link>
                </section>
                </ExternalHint>
            ),
        });
    }
    if (canOrder && !edit) {
        small.push({
            key: 'paket', span: 3, dark: true, node: (
                <ExternalHint source="online" className="h-full">
                <section aria-labelledby="ev-paket" className={cn(siteCardDark, 'flex h-full flex-col gap-3.5 p-5 md:p-6')}>
                    <h2 id="ev-paket" className={cn(cardLabel, 'm-0 text-[var(--site-on-paper-sub)]')}>Paket sipariş</h2>
                    <p className={cn(serif, 'm-0 text-[30px] leading-[1.05]')}>Kapınıza <span className="italic">sıcak gelsin.</span></p>
                    <Link to="/siparis" className={cn(cardButton.accent, 'mt-auto')}>Sipariş ver</Link>
                </section>
                </ExternalHint>
            ),
        });
    }
    if (content.rating !== null) {
        const firstReview = content.featuredReviews[0];
        small.push({
            key: 'puan', span: 3, node: (
                <EditableBlock target="rating" label="Google puanı" className="h-full rounded-[20px]">
                <section aria-labelledby="ev-puan" className={cn(siteCard, 'flex h-full flex-col gap-2.5 p-5 md:p-6')}>
                    <h2 id="ev-puan" className={cn(cardLabel, 'm-0')}>Misafirlerimiz</h2>
                    <p className={cn(serif, 'm-0 flex items-baseline gap-2 text-[40px] leading-none md:text-[44px]')}>
                        <span aria-hidden="true" className="text-[0.7em] text-[#E8A33D]">★</span>{formatRating(content.rating)}
                        <span className="sr-only"> / 5 puan</span>
                    </p>
                    {content.reviewCount !== null && (
                        content.reviewsUrl
                            ? <a href={content.reviewsUrl} target="_blank" rel="noopener noreferrer" className={cardLink}>{content.reviewCount.toLocaleString('tr-TR')} Google yorumu →</a>
                            : <span className="text-sm text-[var(--site-sub)]">{content.reviewCount.toLocaleString('tr-TR')} yorum</span>
                    )}
                    {firstReview && (edit
                        ? <EditableText as="p" field="review:0:text" value={firstReview.text} multiline placeholder="İlk yorumun metni" className={cn(serif, 'm-0 mt-auto line-clamp-3 text-[20px] leading-[1.2]')} />
                        : <p className={cn(serif, 'm-0 mt-auto line-clamp-3 text-[20px] leading-[1.2]')}>“{firstReview.text}”</p>)}
                </section>
                </EditableBlock>
            ),
        });
    } else if (showEmpty) {
        small.push({ key: 'puan', span: 3, node: <EmptySlot target="rating" title="+ Google puanı ekle" /> });
    }
    if (site.phone && small.length < 4 && !edit) {
        small.push({
            key: 'tel', span: 3, node: (
                <ExternalHint source="restaurant" className="h-full">
                    <InfoCard icon={<PhoneIcon />} label="Telefon" labelId="ev-tel" className="h-full"
                        action={<a href={telHref(site.phone)} className={cn(cardButton.outline, 'mt-auto')}>Hemen ara</a>}>
                        <span className={cn(serif, 'text-[24px] leading-none md:text-[28px]')}>{site.phone}</span>
                    </InfoCard>
                </ExternalHint>
            ),
        });
    }

    // Öne çıkan tabak 6/12 ve iki satır; sağındaki 6 sütunu ilk dört küçük kart doldurur (sayı azsa genişlerler).
    const beside = featured ? small.slice(0, 4) : [];
    const after = featured ? small.slice(4) : small;
    const besideWidths: Record<number, number[]> = { 0: [], 1: [6], 2: [6, 6], 3: [3, 3, 6], 4: [3, 3, 3, 3] };
    const besideCards = beside.map((c, i) => ({ ...c, width: besideWidths[beside.length][i] }));

    // Geniş kartlar: hikâye (7) + hazır menü (5), menü (8) + Instagram (4). Eksik olanın yerini komşusu alır.
    const wide: BentoCard[] = [];
    const story = storyCard(site, showEmpty);
    if (story) wide.push({ key: 'hikaye', span: 7, node: story, mobileFull: true });
    const setMenu = edit ? null : setMenuCard(site.setMenus ?? [], products);
    if (setMenu) wide.push({ key: 'menuler', span: 5, node: <ExternalHint source="setMenus" className="h-full">{setMenu}</ExternalHint>, mobileFull: true });
    if (products.length > 0 && !edit) wide.push({ key: 'menu', span: 8, node: <ExternalHint source="menu" className="h-full"><MenuCard site={site} /></ExternalHint>, mobileFull: true });
    const insta = instagramCard(site, Boolean(edit));
    if (insta) wide.push({ key: 'ig', span: 4, node: <EditableBlock target="contact" label="Instagram" className="h-full rounded-[20px]">{insta}</EditableBlock>, mobileFull: true });
    else if (showEmpty) wide.push({ key: 'ig', span: 4, node: <EmptySlot target="contact" title="+ Instagram ekle" />, mobileFull: true });

    // Telefonda iki sütun: açık küçük kartlar ikişer yan yana (tekse tam genişlik), koyu ve geniş kartlar tam genişlik.
    const lightSmall = small.filter(c => !c.dark);
    const lonelyLight = lightSmall.length % 2 === 1 ? lightSmall[lightSmall.length - 1].key : null;
    const mobileSpan = (c: BentoCard) => (c.dark || c.mobileFull || c.key === lonelyLight ? 'col-span-2' : 'col-span-1');

    if (!featured && small.length === 0 && wide.length === 0) return null;
    const featuredSpan = cn('col-span-2', beside.length > 0 ? 'lg:col-span-6 lg:row-span-2' : 'lg:col-span-12 lg:min-h-[420px]');

    return (
        <section aria-label="Restoran hakkında kısaca" className="mx-auto w-full max-w-[1344px] px-4 pb-10 pt-4 md:px-12 md:pb-16 md:pt-12">
            <div className="grid grid-flow-row-dense grid-cols-2 gap-3 md:gap-4 lg:grid-cols-12">
                {featured && (
                    <ExternalHint source="menu" className={featuredSpan}>
                        <FeaturedDishCard product={featured} className={edit ? 'h-full' : featuredSpan} />
                    </ExternalHint>
                )}
                {besideCards.map(c => (
                    <div key={c.key} className={cn('min-w-0', mobileSpan(c), LG_SPAN[c.width], beside.length === 1 && 'lg:row-span-2')}>{c.node}</div>
                ))}
                {packRow(after).map(c => (
                    <div key={c.key} className={cn('min-w-0', mobileSpan(c), LG_SPAN[c.width])}>{c.node}</div>
                ))}
                {packRow(wide).map(c => (
                    <div key={c.key} className={cn('col-span-2 min-w-0', LG_SPAN[c.width])}>{c.node}</div>
                ))}
            </div>
        </section>
    );
}

/** Öne çıkan tabak: büyük fotoğraf, altta kart: "Ustanın seçimi", ad, açıklama · süre, fiyat. */
function FeaturedDishCard({ product, className }: { product: PublicProduct; className?: string }) {
    const meta = [product.description?.trim(), product.prepMinutes ? `~${product.prepMinutes} dk` : null].filter(Boolean).join(' · ');
    return (
        <Link to="/menu" className={cn('group relative block min-h-[300px] overflow-hidden rounded-[20px] bg-[var(--site-placeholder)] md:min-h-[440px] md:rounded-[24px]', className)}>
            <img src={product.imageUrl} alt={product.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
            {product.isStockImage && <StockImageLabel className="bottom-auto top-3 right-3" />}
            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-4 rounded-[14px] bg-[var(--site-card)] p-4 text-[var(--site-text)] md:inset-x-4 md:bottom-4 md:rounded-[18px] md:p-5">
                <div className="flex min-w-0 flex-col gap-1">
                    {product.isFeatured ? <FeaturedBadge /> : <span className={cardLabel}>Menüden</span>}
                    <span className={cn(serif, 'break-words text-[28px] leading-none md:text-[36px]')}>{product.name}</span>
                    {meta && <span className="line-clamp-2 text-sm text-[var(--site-sub)]">{meta}</span>}
                </div>
                <span className="shrink-0 whitespace-nowrap text-xl font-bold md:text-2xl">{formatSitePrice(product.price)}</span>
            </div>
        </Link>
    );
}

/** `showEmpty` (düzenleyici): yazı yokken de kart boş alanlarla çizilir. */
function storyCard(site: PublicSite, showEmpty = false): ReactNode | null {
    const c = site.site;
    if (!c.storyTitle && !c.about && !showEmpty) return null;
    const photo = c.aboutImageUrl || c.galleryImageUrls[0] || site.categories.flatMap(x => x.products).find(p => p.imageUrl && !p.isStockImage)?.imageUrl;
    return (
        <section aria-labelledby="ev-hikaye" className={cn(siteCard, 'grid h-full min-w-0 grid-cols-1 overflow-hidden', photo && 'sm:grid-cols-[minmax(0,240px)_1fr]')}>
            {photo && (
                <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="outline-offset-[-4px]">
                    <img src={photo} alt="" loading="lazy" className="block h-[170px] w-full object-cover sm:h-full sm:min-h-[260px]" />
                </EditableBlock>
            )}
            <div className="flex min-w-0 flex-col justify-center gap-3 p-6 md:p-8">
                <EditableBlock target="year" label="Kuruluş yılı" className="self-start">
                    <span className={eyebrow}>{c.foundedYear ? `Hikâyemiz · ${sinceYear(c.foundedYear)}` : 'Hikâyemiz'}</span>
                </EditableBlock>
                {(c.storyTitle || showEmpty) && (
                    <EditableText as="h2" id="ev-hikaye" field="storyTitle" value={c.storyTitle} placeholder="Slogan yazın"
                        className={cn(serif, 'm-0 break-words text-[30px] leading-[1.04] md:text-[40px]')} />
                )}
                {(c.about || showEmpty) && (
                    <EditableText as="p" field="about" value={c.about} multiline placeholder="Kısa hikâyenizi yazın"
                        className="m-0 line-clamp-4 whitespace-pre-line text-[15px] text-[var(--site-sub)]" />
                )}
                <Link to="/hakkimizda" className={cardLink}>Hakkımızda →</Link>
            </div>
        </section>
    );
}

function setMenuCard(menus: OnlineSetMenu[], products: PublicProduct[]): ReactNode | null {
    const menu = menus[0];
    if (!menu) return null;
    const image = setMenuImage(menu, productPhotos(products));
    const saving = savingLabel(menu);
    return (
        <section aria-labelledby="ev-hazir" className={cn(siteCard, 'flex h-full min-w-0 flex-col overflow-hidden')}>
            {image && (
                <div className="relative h-[160px] shrink-0">
                    <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {saving && <span className="absolute left-3 top-3 rounded-full bg-[var(--site-accent)] px-3 py-1.5 text-xs font-bold text-[var(--site-on-accent)]">{saving}</span>}
                    {image.isStock && <StockImageLabel />}
                </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-6">
                <span className={cardLabel}>Hazır menüler · {menus.length}</span>
                <h2 id="ev-hazir" className={cn(serif, 'm-0 text-[30px] leading-none md:text-[32px]')}>{menu.name}</h2>
                {!image && saving && <span className="self-start rounded-full bg-[var(--site-accent)] px-3 py-1 text-xs font-bold text-[var(--site-on-accent)]">{saving}</span>}
                <SlotsSummary menu={menu} className="line-clamp-2 text-sm text-[var(--site-sub)]" />
                <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 pt-1">
                    <span className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{formatSitePrice(menu.price)}</span>
                        {saving && <s className="text-[var(--site-muted)]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}
                    </span>
                    <Link to="/menu#menuler" className={cardLink}>{menus.length > 1 ? `${menus.length - 1} menü daha →` : 'Menüde gör →'}</Link>
                </div>
            </div>
        </section>
    );
}

/** Menü kartı: az ürünlü menüde ürünler tek tek, çok ürünlüde kategori çipleri (ürün sayısıyla). */
function MenuCard({ site }: { site: PublicSite }) {
    const products = site.categories.flatMap(c => c.products);
    const listAll = products.length <= LIST_ALL_PRODUCTS;
    return (
        <section aria-labelledby="ev-menu" className={cn(siteCard, 'flex h-full min-w-0 flex-col gap-4 p-5 md:p-6')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--site-accent-soft)] text-[var(--site-accent-text)] [&>svg]:h-5 [&>svg]:w-5"><CupIcon /></span>
                    <h2 id="ev-menu" className={cn(cardLabel, 'm-0')}>Menü · {site.categories.length} kategori · {products.length} ürün</h2>
                </div>
                <Link to="/menu" className={cardButton.accent}>Menüyü gör</Link>
            </div>
            {listAll ? (
                <ul className="m-0 grid list-none grid-cols-1 gap-x-6 p-0 sm:grid-cols-2 xl:grid-cols-4">
                    {products.map(p => (
                        <li key={p.id} className="flex justify-between gap-3 border-t border-[var(--site-border)] py-2.5">
                            <span className="min-w-0 truncate font-semibold">{p.name}</span>
                            <span className="shrink-0 tabular-nums">{formatSitePrice(p.price)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {site.categories.map(c => (
                        <li key={c.id}>
                            <Link to={`/menu#kat-${c.id}`} className="flex h-11 items-center rounded-full border border-[var(--site-line)] px-[18px] text-sm font-semibold text-[var(--site-text)] hover:border-[var(--site-text)]">
                                {c.name}<span className="ml-1.5 font-medium opacity-60">{c.products.length}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** `editing` (düzenleyici): yalnız galeri fotoğrafları (menü fotoğrafları burada değişmez). */
function instagramCard(site: PublicSite, editing = false): ReactNode | null {
    const url = site.site.instagramUrl;
    if (!url) return null;
    const photos = editing ? site.site.galleryImageUrls.slice(0, 3).map(u => ({ url: u })) : collagePhotos(site, 3);
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={cn(siteCard, 'flex h-full min-w-0 flex-col gap-3 p-5 no-underline md:p-6')}>
            <span className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--site-accent-soft)] text-[var(--site-accent-text)] [&>svg]:h-5 [&>svg]:w-5"><InstagramIcon /></span>
                <span className={cardLabel}>{instagramHandle(url)}</span>
            </span>
            {photos.length >= 3 ? (
                <span className="grid grid-cols-3 gap-1.5">
                    {photos.map((p, i) => <img key={i} src={p.url} alt="" loading="lazy" className="aspect-square w-full rounded-[10px] object-cover" />)}
                </span>
            ) : (
                <span className={cn(serif, 'text-[26px] leading-[1.1]')}>Masamızdan kareler <span className="italic">Instagram'da.</span></span>
            )}
            <span className="mt-auto text-sm font-semibold underline underline-offset-4">Takip et →</span>
        </a>
    );
}

// ── Menüden seçmeler ─────────────────────────────────────────────────────────────────────────────

/** Ürün çoksa (menü kartı yalnız kategori gösteriyorsa) üç seçme ürün; öne çıkan büyük tabak tekrar edilmez. */
function HomePicks({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const products = site.categories.flatMap(c => c.products);
    if (products.length <= LIST_ALL_PRODUCTS || edit) return null;
    const big = pickFeatured(products, 1, true)[0];
    const picks = pickFeatured(products.filter(p => p.id !== big?.id), 3);
    if (picks.length < 2) return null;
    return (
        <ExternalHint source="menu" className="mx-auto w-full max-w-[1344px]">
        <section aria-labelledby="ev-secmeler" className="mx-auto flex w-full max-w-[1344px] flex-col gap-5 px-5 pb-12 md:gap-6 md:px-12 md:pb-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="ev-secmeler" className={cn(serif, 'm-0 text-[40px] leading-none md:text-[52px]')}>Menüden <span className="italic">seçmeler.</span></h2>
                <Link to="/menu" className={cardLink}>Tüm menü · {products.length} ürün →</Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3">
                {picks.map(p => <MenuProductCard key={p.id} product={p} />)}
            </div>
        </section>
        </ExternalHint>
    );
}

/** Restoranın seçtiği yorumlar (ikinci ve sonrası; ilki puan kartında). */
function HomeReviews({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    const all = c.featuredReviews;
    // Düzenleyicide bütün yorumlar burada kart olarak yönetilir (ilki sitede puan kartında da görünür).
    const offset = c.rating !== null && !edit ? 1 : 0;
    const reviews = all.slice(offset);
    const max = SITE_LIMITS.review.max;
    if (reviews.length === 0 && !(edit?.showEmpty && all.length < max)) return null;
    const cells = reviews.length + (edit && all.length < max ? 1 : 0);
    return (
        <section aria-labelledby="ev-yorumlar" className="mx-auto flex w-full max-w-[1344px] flex-col gap-5 px-5 pb-12 md:px-12 md:pb-16">
            <h2 id="ev-yorumlar" className={cn(serif, 'm-0 text-[36px] leading-none md:text-[44px]')}>Misafirlerimiz <span className="italic">ne diyor?</span></h2>
            <div className={cn('grid grid-cols-1 gap-3 md:gap-4', cells >= 2 && 'md:grid-cols-2', cells >= 3 && 'lg:grid-cols-3')}>
                {reviews.map((r, i) => {
                    const index = i + offset;
                    return (
                        <ListCard key={index} list="reviews" index={index} count={all.length} label="Yorum" className="flex">
                            <figure className={cn(siteCard, 'm-0 flex flex-1 flex-col gap-3 p-6')}>
                                <Stars value={5} className="text-base" />
                                {edit ? (
                                    <>
                                        <EditableText as="blockquote" field={`review:${index}:text`} value={r.text} multiline placeholder="Yorumun metni"
                                            className={cn(serif, 'm-0 text-[22px] leading-[1.25]')} />
                                        <figcaption className="mt-auto flex flex-wrap gap-x-1.5 text-sm text-[var(--site-sub)]">
                                            <EditableText field={`review:${index}:author`} value={r.author} placeholder="Yazan" />·
                                            <EditableText field={`review:${index}:source`} value={r.source} placeholder="Kaynak" />
                                        </figcaption>
                                        {index === 0 && c.rating !== null && <span className="text-xs text-[var(--site-muted)]">Sitede puan kartında görünür.</span>}
                                    </>
                                ) : (
                                    <>
                                        <blockquote className={cn(serif, 'm-0 text-[22px] leading-[1.25]')}>“{r.text}”</blockquote>
                                        <figcaption className="mt-auto text-sm text-[var(--site-sub)]">{[r.author, r.source].filter(Boolean).join(' · ')}</figcaption>
                                    </>
                                )}
                            </figure>
                        </ListCard>
                    );
                })}
                <AddCard list="reviews" label="Yorum ekle" count={all.length} max={max} />
            </div>
        </section>
    );
}

// ── Fotoğraf şeridi ──────────────────────────────────────────────────────────────────────────────

/** Mekân ve menü fotoğrafları: 3 → 3'lü, 4–5 → 4'lü, 6 ve üstü → 6'lı. 3'ten azsa çizilmez. */
function PhotoStrip({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    // Düzenleyicide yalnız galeri fotoğrafları (menü fotoğrafları Yemeklerimiz'den gelir).
    const all = edit ? site.site.galleryImageUrls.slice(0, 6).map(url => ({ url, isStock: url.includes('/shared/stock/'), alt: '' })) : collagePhotos(site, 6);
    if (all.length < (edit ? 1 : 3)) {
        if (!edit?.showEmpty) return null;
        return (
            <div className="mx-auto w-full max-w-[1344px] px-5 pb-12 md:px-12">
                <EmptySlot target="gallery:add" title="+ Fotoğraf ekle" />
            </div>
        );
    }
    const count = all.length >= 6 ? 6 : all.length >= 4 ? 4 : edit ? all.length : 3;
    const photos = all.slice(0, count);
    const cols = ({ 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 6: 'grid-cols-3 md:grid-cols-6' } as Record<number, string>)[count];
    const instagram = site.site.instagramUrl;
    const galleryCount = site.site.galleryImageUrls.length;
    const igX = editTarget(edit, 'contact', 'Instagram');
    return (
        <section aria-label="Fotoğraflar" className={cn('relative grid', cols)}>
            {photos.map((p, i) => {
                // Galeriden gelen kare galeri fotoğrafıdır; sonrakiler menüdeki ürün fotoğrafları.
                const x = i < galleryCount ? editTarget(edit, `gallery:${i}`, `Mekân fotoğrafı ${i + 1}`) : { className: '' };
                return (
                    <div key={i} {...x} className={cn('relative', x.className)}>
                        <img src={p.url} alt={p.alt} loading="lazy" className="block aspect-square w-full object-cover" />
                        {p.isStock && <StockImageLabel />}
                    </div>
                );
            })}
            {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer" {...igX}
                    className={cn('absolute left-1/2 top-1/2 flex h-14 max-w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-full bg-[var(--site-card)] px-7 font-semibold text-[var(--site-text)] shadow-[0_12px_30px_rgba(0,0,0,0.18)]', igX.className)}>
                    <span aria-hidden="true" className="shrink-0 [&>svg]:h-5 [&>svg]:w-5"><InstagramIcon /></span>
                    <span className="truncate">{instagramHandle(instagram)}</span>
                </a>
            )}
        </section>
    );
}
