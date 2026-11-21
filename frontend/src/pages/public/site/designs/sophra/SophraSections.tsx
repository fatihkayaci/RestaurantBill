import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicProduct, type PublicSite } from '@/features/customerSite/types';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { ImageSlot } from '../../SiteChrome';
import { RESERVATION_PATH, amenityLabel, formatRating, hasAboutPage, hasVenuePage, instagramHandle, serif } from '../../siteParts';
import { directionsUrl, formatSitePrice, telHref, whatsappHref } from '../../siteTheme';
import { fullAddress, restaurantName, weekSchedule } from '../../useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ListCard } from '../../siteEdit';
import { SITE_LIMITS, editExternal, useSiteEdit } from '../../siteEditContext';
import { featuredProducts, filledCategories } from '../../homeSections';
import {
    ArrowGlyph, ClockGlyph, DirectionsGlyph, InstagramGlyph, LeafSprig, MinusGlyph, PhoneGlyph, PinGlyph, PlusGlyph, SpIcon, StarGlyph,
    WhatsAppGlyph, CalendarGlyph,
} from './SophraIcons';
import { AMENITY_ICON, categoryIcon, valueIcon } from './iconKinds';
import { spButton, spCard, spEyebrow, spLink, spRail, spTitle, spWrap } from './sophraParts';

// Sophra ana sayfasının sıralanabilen bölümleri (sıra ve görünürlük: homeSections). Her bölüm verisi yoksa hiç çizilmez
// (null): kapatılan ya da boş bölüm boşluk bırakmaz; aralıklar bölümün kendi iç boşluğundadır. Düzenleyicide (useSiteEdit)
// "Boş alanları göster" açıkken yerinde yazılan bölümler kesikli yer tutucularla çizilir.

const sectionY = 'py-14 sm:py-20';

// ── Menü kategorileri ───────────────────────────────────────────────────────────────────────────

const CATEGORY_MAX = 6;

/** Kategoriler kart olarak; menüdeki o bölüme götürür. Kartın fotoğrafı kategorinin ilk fotoğraflı ürünü; hiçbir
 *  kategoride fotoğraf yoksa yalnız simge. `overlap`: kapağın hemen ardındaysa dalgaya biner. */
export function CategoriesSection({ site, overlap }: { site: PublicSite; overlap: boolean }) {
    const all = filledCategories(site);
    if (all.length === 0) return null;
    const more = all.length > CATEGORY_MAX;
    const cats = more ? all.slice(0, CATEGORY_MAX - 1) : all;
    const photoOf = (id: string) => all.find(c => c.id === id)?.products.find(p => p.imageUrl)?.imageUrl ?? '';
    const withPhotos = cats.some(c => photoOf(c.id));
    const cell = 'w-[148px] shrink-0 snap-start sm:w-[170px] lg:w-auto';
    const card = cn(spCard, 'group flex h-full flex-col overflow-hidden text-[var(--site-text)] no-underline transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--site-border-strong)] motion-reduce:hover:translate-y-0');

    return (
        <section aria-label="Menü kategorileri" className={cn('relative z-10', overlap ? '-mt-[100px] sm:-mt-[108px] lg:-mt-[116px]' : 'pt-14 sm:pt-20')}>
            <div className={spWrap}>
                <ul className={cn(spRail, 'm-0 list-none py-1 lg:mx-0 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:gap-4 lg:overflow-visible lg:px-0')}>
                    {cats.map(cat => {
                        const photo = photoOf(cat.id);
                        return (
                            <li key={cat.id} className={cell}>
                                <Link to={`/menu#paket-${cat.id}`} className={card}>
                                    {withPhotos && (
                                        <span className="relative block aspect-[16/10] overflow-hidden bg-[var(--site-alt)]">
                                            {photo && <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />}
                                        </span>
                                    )}
                                    <span className={cn('flex flex-1 flex-col items-center gap-2 px-3 text-center', withPhotos ? 'pb-4' : 'py-5')}>
                                        <span className={cn('relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-accent-text)]',
                                            withPhotos ? '-mt-[22px] border border-[var(--site-border)] bg-[var(--site-card)]' : 'bg-[var(--site-alt)]')}>
                                            <SpIcon kind={categoryIcon(cat.name)} className="h-[22px] w-[22px]" />
                                        </span>
                                        <span className="text-[15px] font-bold leading-snug">{cat.name}</span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                    {more && (
                        <li className={cell}>
                            <Link to="/menu" className={cn(card, 'items-center justify-center gap-2 bg-[var(--site-paper)] px-3 py-5 text-center text-[var(--site-on-paper)]')}>
                                <span className={cn(serif, 'text-[30px] leading-none text-[var(--site-mustard-text)]')}>+{all.length - cats.length}</span>
                                <span className="text-[15px] font-bold">Tüm kategoriler</span>
                            </Link>
                        </li>
                    )}
                </ul>
            </div>
        </section>
    );
}

// ── Öne çıkan ürünler ───────────────────────────────────────────────────────────────────────────

const FEATURED_MAX = 8;

/** Yemeklerimiz'de "öne çıkan" işaretli, tükenmemiş ürünler. Online sipariş açıksa kartta + (sepete ekle), değilse menüye. */
export function FeaturedSection({ site }: { site: PublicSite }) {
    const cart = useSiteCart();
    const [announce, setAnnounce] = useState('');
    // Dört sütunda yarım sıra kalmasın: 8 ve üstü 8, değilse en çok 4.
    const all = featuredProducts(site);
    const items = all.slice(0, all.length >= FEATURED_MAX ? FEATURED_MAX : 4);
    if (items.length === 0) return null;
    const name = restaurantName(site);
    const qty = (id: string) => cart.lines.filter(l => l.kind === 'product' && l.productId === id).reduce((s, l) => s + l.quantity, 0);
    const canAdd = (id: string) => { const d = cart.productFor(id); return cart.enabled && !!d && !d.isOutOfStock; };

    return (
        <section aria-labelledby="sp-one-cikan" className={sectionY}>
            <div className={cn(spWrap, 'flex flex-col gap-8')}>
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                    <h2 id="sp-one-cikan" className={spTitle}>Öne çıkan lezzetler</h2>
                    <Link to="/menu" className={spLink}>Tüm menüye git<ArrowGlyph className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" /></Link>
                </div>
                <ul className={cn(spRail, 'm-0 list-none py-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4')}>
                    {items.map(({ product, categoryId }) => (
                        <li key={product.id} className="w-[76%] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                            <ProductCard product={product} restaurant={name} categoryId={categoryId} quantity={qty(product.id)} canAdd={canAdd(product.id)}
                                onAdd={() => { cart.addProduct(product.id); setAnnounce(`${product.name} sepete eklendi.`); }}
                                onRemove={() => { cart.removeProduct(product.id); setAnnounce(`${product.name} sepetten çıkarıldı.`); }} />
                        </li>
                    ))}
                </ul>
                {cart.enabled && cart.count > 0 && (
                    <Link to="/menu" className={cn(spButton.accent, 'self-start')}>Sepete git ({cart.count})</Link>
                )}
                <p className="sr-only" aria-live="polite">{announce}</p>
            </div>
        </section>
    );
}

function ProductCard({ product, restaurant, categoryId, quantity, canAdd, onAdd, onRemove }: {
    product: PublicProduct; restaurant: string; categoryId: string; quantity: number; canAdd: boolean; onAdd: () => void; onRemove: () => void;
}) {
    const round = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-focus)] focus-visible:ring-offset-2';
    return (
        <article className={cn(spCard, 'flex h-full flex-col overflow-hidden')}>
            <div className="relative">
                <ImageSlot src={product.imageUrl} alt={product.name} restaurant={restaurant} className="aspect-[4/3]" />
                {product.isStockImage && product.imageUrl && <StockImageLabel />}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4 pb-3">
                <h3 className="m-0 text-[17px] font-bold leading-snug">{product.name}</h3>
                {product.description?.trim() && <p className="m-0 line-clamp-2 text-[14px] leading-snug text-[var(--site-sub)]">{product.description}</p>}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 pb-4">
                <span className={cn(serif, 'whitespace-nowrap text-[22px] leading-none tabular-nums')}>{formatSitePrice(product.price)}</span>
                {canAdd ? (quantity > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--site-alt)] p-0.5">
                        <button type="button" onClick={onRemove} aria-label={`${product.name}: bir azalt`} className={cn(round, 'h-10 w-10 text-[var(--site-text)]')}><MinusGlyph className="h-4 w-4" /></button>
                        <span className="min-w-5 text-center font-bold tabular-nums" aria-label={`${quantity} adet`}>{quantity}</span>
                        <button type="button" onClick={onAdd} aria-label={`${product.name}: bir artır`} className={cn(round, 'h-10 w-10 bg-[var(--site-accent)] text-[var(--site-on-accent)]')}><PlusGlyph className="h-4 w-4" /></button>
                    </span>
                ) : (
                    <button type="button" onClick={onAdd} aria-label={`${product.name} sepete ekle`} className={cn(round, 'bg-[var(--site-accent)] text-[var(--site-on-accent)]')}><PlusGlyph /></button>
                )) : (
                    <Link to={`/menu#paket-${categoryId}`} aria-label={`${product.name}, menüde gör`} className={cn(round, 'border border-[var(--site-border-strong)] text-[var(--site-text)]')}><ArrowGlyph /></Link>
                )}
            </div>
        </article>
    );
}

// ── Hakkımızda ──────────────────────────────────────────────────────────────────────────────────

/** Hikâye fotoğrafı (yoksa ilk mekân fotoğrafı) solda; başlık, metin ve Hakkımızda'ya düğme sağda. */
export function AboutSection({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    if (!c.about && !c.storyTitle && !showEmpty) return null;
    const photo = c.aboutImageUrl || c.galleryImageUrls[0] || '';
    return (
        <section aria-labelledby="sp-hakkimizda" className={cn('relative overflow-hidden', sectionY)}>
            <LeafSprig className="pointer-events-none absolute -right-8 top-6 hidden w-[200px] text-[var(--site-border-mid)] lg:block" />
            <div className={cn(spWrap, 'relative grid items-center gap-8 sm:gap-10', (photo || showEmpty) && 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16')}>
                {photo ? (
                    <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="rounded-[24px]">
                        <img src={photo} alt="" loading="lazy" className="block aspect-[16/11] w-full rounded-[24px] object-cover" />
                    </EditableBlock>
                ) : <EmptySlot target="photo:about" title="+ Hikâye fotoğrafı ekle" className="aspect-[16/11]" />}
                <div className="flex min-w-0 flex-col items-start gap-5">
                    <p className={spEyebrow}>Hakkımızda</p>
                    <h2 id="sp-hakkimizda" className={spTitle}>
                        <EditableText field="storyTitle" value={c.storyTitle} fallback={restaurantName(site)} placeholder="Hikâyenizin başlığı" />
                    </h2>
                    {(c.about || showEmpty) && (
                        <EditableText as="p" field="about" value={c.about} multiline placeholder="Kısa hikâyeniz: nasıl başladınız, neyi farklı yapıyorsunuz."
                            className={cn('m-0 max-w-[58ch] whitespace-pre-line text-[17px] leading-[1.7] text-[var(--site-sub)]', !edit && 'line-clamp-6')} />
                    )}
                    {!edit && hasAboutPage(site) && (
                        <Link to="/hakkimizda" className={cn(spButton.accent, 'mt-1')}>Hikâyemizi keşfedin<ArrowGlyph /></Link>
                    )}
                </div>
            </div>
        </section>
    );
}

// ── Neden biz: değerler + olanaklar ─────────────────────────────────────────────────────────────

const FEATURE_MAX = 8;

/** Restoranın kendi değerleri (başlık + cümle) ve mekânın olanakları, simgeli kutucuklar. */
export function FeaturesSection({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const values = c.values;
    const amenities = c.amenities.filter(a => amenityLabel(a)).slice(0, Math.max(0, FEATURE_MAX - values.length));
    if (values.length === 0 && amenities.length === 0 && !showEmpty) return null;
    const tile = cn(spCard, 'flex h-full flex-col items-start gap-3 p-4 sm:flex-row sm:gap-4 sm:p-5');
    const iconBox = 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--site-alt)] text-[var(--site-accent-text)]';
    return (
        <section aria-labelledby="sp-neden" className="py-10 sm:py-14">
            <div className={cn(spWrap, 'flex flex-col gap-4')}>
                <h2 id="sp-neden" className="sr-only">Bizi farklı kılanlar</h2>
                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:gap-4 lg:grid-cols-4">
                    {values.map((v, i) => (
                        <li key={`v${i}`} className="min-w-0">
                            <ListCard list="values" index={i} count={values.length} label="Değer" className="h-full rounded-[20px]">
                                <div className={tile}>
                                    <span aria-hidden="true" className={iconBox}><SpIcon kind={valueIcon(v.title)} /></span>
                                    <span className="flex min-w-0 flex-col gap-1">
                                        <EditableText as="h3" field={`value:${i}:title`} value={v.title} placeholder="Başlık" className="m-0 text-[17px] font-bold leading-snug" />
                                        {(v.text || edit) && <EditableText as="p" field={`value:${i}:text`} value={v.text} multiline placeholder="Kısa açıklama"
                                            className="m-0 text-[14px] leading-snug text-[var(--site-sub)]" />}
                                    </span>
                                </div>
                            </ListCard>
                        </li>
                    ))}
                    {amenities.map(a => (
                        <li key={a} className="min-w-0">
                            <EditableBlock target="amenities" label="Olanaklar" className="h-full rounded-[20px]">
                                <div className={cn(tile, 'sm:items-center')}>
                                    <span aria-hidden="true" className={iconBox}><SpIcon kind={AMENITY_ICON[a] ?? 'seal'} /></span>
                                    <span className="text-[16px] font-bold leading-snug">{amenityLabel(a)}</span>
                                </div>
                            </EditableBlock>
                        </li>
                    ))}
                </ul>
                <AddCard list="values" label="+ Değer ekle (ör. Taze malzeme, her sabah)" count={values.length} max={SITE_LIMITS.value.max} />
                {amenities.length === 0 && <EmptySlot target="amenities" title="+ Mekânın olanaklarını seçin" />}
            </div>
        </section>
    );
}

// ── Galeri ve Instagram ─────────────────────────────────────────────────────────────────────────

const GALLERY_MAX = 5;
// Fotoğraf şeridinin genişlik oranları (dergi düzeni: geniş, dar, orta…); sırayla tekrar eder.
const STRIP_GROW = [1.45, 1, 1.2, 0.9, 1.3, 1];

/** Mekân fotoğrafları (yönetici yükler) ve Instagram hesabı (bağlantı + kullanıcı adı). Biri yoksa öteki tek başına. */
export function GallerySection({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const photos = c.galleryImageUrls.slice(0, GALLERY_MAX);
    const ig = c.instagramUrl;
    if (photos.length === 0 && !ig && !showEmpty) return null;
    const venue = !edit && hasVenuePage(site);

    const igBlock = ig ? (
        <EditableBlock target="contact" label="Instagram" className="rounded-[20px]">
            <div className="flex flex-col items-start gap-4">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-mustard-text)]"><InstagramGlyph className="h-6 w-6" /></span>
                <h2 id="sp-galeri" className={cn(serif, 'm-0 text-[28px] leading-[1.1] sm:text-[32px]')}>Instagram’da takip edin</h2>
                <p className="m-0 max-w-[32ch] text-[15px] leading-relaxed text-[var(--site-sub)]">Yeni tabaklar, günün menüsü ve mekândan kareler.</p>
                <a href={ig} target="_blank" rel="noopener noreferrer" className={spButton.outline}>
                    {instagramHandle(ig)}
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
                </a>
            </div>
        </EditableBlock>
    ) : showEmpty ? <EmptySlot target="contact" title="+ Instagram hesabınızı ekleyin" className="min-h-[200px]" /> : null;

    const strip = photos.length > 0 ? (
        <ul className={cn(spRail, 'm-0 list-none md:mx-0 md:flex md:h-[300px] md:snap-none md:gap-3 md:overflow-visible md:px-0 lg:h-[340px]')}>
            {photos.map((src, i) => {
                const img = <img src={src} alt="" loading="lazy" className="h-full w-full rounded-[18px] object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />;
                return (
                    <li key={src + i} className={cn('h-[260px] w-[64%] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-[18px] md:h-full md:w-auto md:max-w-none md:min-w-0 md:[flex:var(--sp-grow)_1_0%]',
                        i % 2 === 1 && 'md:mt-8 md:h-[calc(100%-2rem)]')}
                        style={{ '--sp-grow': STRIP_GROW[i % STRIP_GROW.length] } as CSSProperties}>
                        <EditableBlock target={`gallery:${i}`} label="Mekân fotoğrafı" className="h-full rounded-[18px]">
                            {venue ? <Link to="/mekan" aria-label={`Mekân fotoğrafı ${i + 1}, Mekân sayfasında gör`} className="group block h-full overflow-hidden rounded-[18px]">{img}</Link>
                                : <span className="group block h-full overflow-hidden rounded-[18px]">{img}</span>}
                        </EditableBlock>
                    </li>
                );
            })}
            {edit && c.galleryImageUrls.length < SITE_LIMITS.gallery && (
                <li className="h-[260px] w-[40%] shrink-0 md:h-full md:w-[120px]">
                    <EmptySlot target="gallery:add" title="+ Fotoğraf" className="h-full" />
                </li>
            )}
        </ul>
    ) : showEmpty ? <EmptySlot target="gallery:add" title="+ Mekân fotoğrafı ekleyin" className="min-h-[200px]" /> : null;

    return (
        <section aria-labelledby={ig ? 'sp-galeri' : igBlock ? undefined : 'sp-galeri-baslik'} aria-label={!ig && igBlock ? 'Galeri' : undefined} className={sectionY}>
            <div className={cn(spWrap, 'grid gap-8', (ig || showEmpty) && photos.length > 0 && 'lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-center lg:gap-10')}>
                {igBlock ?? (
                    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                        <h2 id="sp-galeri-baslik" className={spTitle}>Mekândan kareler</h2>
                        {venue && <Link to="/mekan" className={spLink}>Mekânı gezin<ArrowGlyph className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" /></Link>}
                    </div>
                )}
                {strip}
            </div>
        </section>
    );
}

// ── Puan ve yorumlar ────────────────────────────────────────────────────────────────────────────

/** Google puanı (restoranın girdiği gerçek puan; "Google" diye etiketlenir) ve seçilen misafir yorumları (her biri kendi
 *  kaynağıyla). İkisi de yoksa bölüm yok. Sophra'nın kendi yorumları geldiğinde ayrı bir blok olarak eklenir. */
export function ReviewsSection({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const reviews = c.featuredReviews.slice(0, SITE_LIMITS.review.max);
    if (c.rating === null && reviews.length === 0 && !showEmpty) return null;
    const stars = c.rating === null ? 0 : Math.round(c.rating);

    const ratingBlock = c.rating !== null ? (
        <EditableBlock target="rating" label="Google puanı" className="rounded-[24px]">
            <div className="flex flex-col items-start gap-3 rounded-[24px] bg-[var(--site-paper)] p-7 text-[var(--site-on-paper)] sm:p-8">
                <span className="text-[13px] font-bold uppercase tracking-[0.16em] text-[var(--site-on-paper-sub)]">Google puanı</span>
                <span className={cn(serif, 'text-[72px] leading-none tabular-nums')}>{formatRating(c.rating)}</span>
                <span className="flex gap-1 text-[var(--site-mustard-text)]" role="img" aria-label={`5 üzerinden ${formatRating(c.rating)}`}>
                    {[0, 1, 2, 3, 4].map(i => <StarGlyph key={i} filled={i < stars} className="h-5 w-5" />)}
                </span>
                {c.reviewCount !== null && <span className="text-[15px] text-[var(--site-on-paper-sub)]">{c.reviewCount.toLocaleString('tr-TR')} değerlendirme</span>}
                {c.reviewsUrl && !edit && (
                    <a href={c.reviewsUrl} target="_blank" rel="noopener noreferrer" className={cn(spButton.ghost, 'mt-2 min-h-11 px-5 text-[14px]')}>Google’da yorumları okuyun</a>
                )}
            </div>
        </EditableBlock>
    ) : showEmpty ? <EmptySlot target="rating" title="+ Google puanınızı ekleyin" className="min-h-[220px]" /> : null;

    return (
        <section aria-labelledby="sp-yorumlar" className={cn('bg-[var(--site-alt)]', sectionY)}>
            <div className={cn(spWrap, 'flex flex-col gap-8')}>
                <h2 id="sp-yorumlar" className={spTitle}>Misafirlerimiz ne diyor?</h2>
                <div className={cn('grid gap-4 sm:gap-5', ratingBlock && (reviews.length > 0 || edit) && 'lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]')}>
                    {ratingBlock}
                    {(reviews.length > 0 || edit) && (
                        <div className="flex flex-col gap-4">
                            <ul className={cn('m-0 grid list-none gap-4 p-0 sm:gap-5', reviews.length > 1 && 'md:grid-cols-2', reviews.length > 2 && 'xl:grid-cols-3')}>
                                {reviews.map((r, i) => (
                                    <li key={i} className="min-w-0">
                                        <ListCard list="reviews" index={i} count={reviews.length} label="Yorum" className="h-full rounded-[20px]">
                                            <figure className={cn(spCard, 'm-0 flex h-full flex-col gap-5 p-6 sm:p-7')}>
                                                <span aria-hidden="true" className={cn(serif, 'h-6 text-[56px] leading-[0.8] text-[var(--site-accent-text)]')}>“</span>
                                                <blockquote className="m-0 text-[17px] leading-[1.6]">
                                                    <EditableText field={`review:${i}:text`} value={r.text} multiline placeholder="Yorum" />
                                                </blockquote>
                                                <figcaption className="mt-auto text-[15px]">
                                                    <EditableText field={`review:${i}:author`} value={r.author} placeholder="Ad" className="font-bold" />
                                                    {(r.source || edit) && <span className="text-[var(--site-muted)]">, <EditableText field={`review:${i}:source`} value={r.source} placeholder="Kaynak" /></span>}
                                                </figcaption>
                                            </figure>
                                        </ListCard>
                                    </li>
                                ))}
                            </ul>
                            <AddCard list="reviews" label="+ Misafir yorumu ekle" count={reviews.length} max={SITE_LIMITS.review.max} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// ── İletişim ve konum ───────────────────────────────────────────────────────────────────────────

/** Adres, telefon, WhatsApp, saatler; "Yol tarifi al" ve (açıksa) "Rezervasyon yap"; harita isteyince yüklenir. */
export function ContactSection({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const [mapOn, setMapOn] = useState(false);
    const c = site.site;
    const address = fullAddress(site);
    const rows = weekSchedule(site);
    const today = rows?.find(r => r.isToday) ?? null;
    const uniform = !!rows && rows.every(r => r.isOpen && r.text === rows[0].text);
    const canReserve = canReserveOnline(site);
    if (!address && !site.phone && !c.whatsappPhone) return null;
    const restaurantX = editExternal(edit, 'restaurant');
    const row = 'flex items-start gap-4';
    const icon = 'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-alt)] text-[var(--site-accent-text)]';

    return (
        <section aria-labelledby="sp-iletisim" className={sectionY}>
            <div className={cn(spWrap, 'grid gap-10', address && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14')}>
                <div className="flex min-w-0 flex-col gap-7">
                    <div className="flex flex-col gap-3">
                        <p className={spEyebrow}>İletişim</p>
                        <h2 id="sp-iletisim" className={spTitle}>Bize ulaşın</h2>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-5 p-0 text-[16px]">
                        {address && (
                            <li className={row}>
                                <span aria-hidden="true" className={icon}><PinGlyph /></span>
                                <span {...restaurantX} className={cn('flex min-w-0 flex-col gap-1', restaurantX.className)}>
                                    <span className="break-words font-semibold">{site.openAddress || address}</span>
                                    {site.openAddress && (site.district || site.city) && <span className="text-[var(--site-sub)]">{[site.district, site.city].filter(Boolean).join(' / ')}</span>}
                                    {c.directionsNote && <span className="text-[15px] text-[var(--site-sub)]">{c.directionsNote}</span>}
                                </span>
                            </li>
                        )}
                        {site.phone && (
                            <li className={row}>
                                <span aria-hidden="true" className={icon}><PhoneGlyph /></span>
                                <a href={telHref(site.phone)} {...restaurantX} className={cn('inline-flex min-h-10 items-center font-semibold text-[var(--site-text)] no-underline hover:underline', restaurantX.className)}>{site.phone}</a>
                            </li>
                        )}
                        {c.whatsappPhone && (
                            <li className={row}>
                                <span aria-hidden="true" className={icon}><WhatsAppGlyph /></span>
                                <a href={whatsappHref(c.whatsappPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center font-semibold text-[var(--site-text)] no-underline hover:underline">
                                    WhatsApp’tan yazın
                                </a>
                            </li>
                        )}
                        {rows && (
                            <li>
                                <EditableBlock target="hours" label="Çalışma saatleri" className="rounded-[16px]">
                                    <div className={row}>
                                        <span aria-hidden="true" className={icon}><ClockGlyph /></span>
                                        {uniform ? (
                                            <span className="flex min-h-10 items-center font-semibold">Her gün <span className="ml-1.5 tabular-nums">{rows[0].text}</span></span>
                                        ) : (
                                            <details className="group min-w-0 flex-1">
                                                <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
                                                    {today ? <>Bugün <span className="tabular-nums">{today.text}</span></> : 'Çalışma saatleri'}
                                                    <span className="text-[14px] font-medium text-[var(--site-accent-text)] underline underline-offset-4">Haftanın saatleri</span>
                                                </summary>
                                                <dl className="m-0 mt-2 flex max-w-[340px] flex-col gap-1.5 text-[15px]">
                                                    {rows.map(r => (
                                                        <div key={r.day} className={cn('flex justify-between gap-4', r.isToday ? 'font-bold' : 'text-[var(--site-sub)]')}>
                                                            <dt>{r.label}</dt><dd className="m-0 tabular-nums">{r.text}</dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            </details>
                                        )}
                                    </div>
                                </EditableBlock>
                            </li>
                        )}
                    </ul>
                    {!edit && (address || canReserve || site.phone) && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            {address && <a href={directionsUrl(address)} target="_blank" rel="noopener noreferrer" className={spButton.accent}><DirectionsGlyph className="h-[18px] w-[18px]" />Yol tarifi al</a>}
                            {canReserve ? <Link to={RESERVATION_PATH} className={spButton.outline}><CalendarGlyph className="h-[18px] w-[18px]" />Rezervasyon yap</Link>
                                : site.phone && <a href={telHref(site.phone)} className={spButton.outline}><PhoneGlyph className="h-[18px] w-[18px]" />Hemen ara</a>}
                        </div>
                    )}
                </div>
                {address && (
                    <div className="relative min-h-[300px] overflow-hidden rounded-[24px] border border-[var(--site-border)] bg-[var(--site-alt)] lg:min-h-[420px]">
                        {mapOn ? (
                            <iframe title={`Harita: ${address}`} src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                                loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 h-full w-full border-0" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(var(--site-line)_1px,transparent_1px),linear-gradient(90deg,var(--site-line)_1px,transparent_1px)] bg-[length:28px_28px] p-6 text-center">
                                <span aria-hidden="true" className="absolute left-[-10%] right-[-10%] top-[58%] h-3 -rotate-[8deg] bg-[var(--site-card)]" />
                                <span aria-hidden="true" className="absolute bottom-[-10%] top-[-10%] left-[62%] w-2.5 rotate-[12deg] bg-[var(--site-card)]" />
                                <span aria-hidden="true" className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)] shadow-[0_0_0_10px_color-mix(in_srgb,var(--site-accent)_18%,transparent)]"><PinGlyph className="h-6 w-6" /></span>
                                <span className="relative max-w-[32ch] rounded-xl bg-[var(--site-card)] px-3 py-1.5 text-[15px] font-semibold">{site.openAddress || address}</span>
                                {!edit && (
                                    <button type="button" onClick={() => setMapOn(true)} className={cn(spButton.outline, 'relative bg-[var(--site-card)]')}>
                                        Haritayı göster
                                    </button>
                                )}
                                {!edit && <span className="relative text-[12px] text-[var(--site-muted)]">Harita Google Haritalar’dan yüklenir.</span>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
