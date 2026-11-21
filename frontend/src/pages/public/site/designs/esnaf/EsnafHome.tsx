import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicCategory, type PublicSite } from '@/features/customerSite/types';
import { useOnlineOrdering } from '@/features/delivery/useOnlineOrderingAvailable';
import { useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { MyReservations } from '../../SiteChrome';
import { SitePage } from '../../SiteFrame';
import { EditorGallery, EditorVisit } from '../../EditorExtras';
import { SlotsSummary } from '../../SiteSetMenus';
import { RESERVATION_PATH, formatRating, hasAboutPage, productCount, serif, sinceYear } from '../../siteParts';
import { directionsUrl, formatSitePrice, initials, telHref } from '../../siteTheme';
import { fullAddress, restaurantName } from '../../useSite';
import { AddCard, EditableBlock, EditableText, EmptySlot, ExternalHint, ListCard } from '../../siteEdit';
import { SITE_LIMITS, editExternal, useSiteEdit } from '../../siteEditContext';
import type { DesignHomeProps } from '../registry';
import { AddSquare, CallBand, EsHeading, OpenLine, PhoneGlyph, PriceRow, TileStrip, YearStamp } from './EsnafBits';
import { EsnafCategoryHeader } from './EsnafMenuParts';
import { useEsnafMobileActions } from './esnafActions';
import { boardHighlights, deliveryFacts, esButton, esLink, esSign, esWrap, signFit } from './esnafParts';

// Esnaf Tabelası ana sayfası. Ortak düzenin kutularından ve Meyhane'nin gece akışından ayrı: mahallenin esnaf
// lokantasına / kebapçısına girer gibi, hızlı ve doyurucu.
// (1) TABELA: kapak renginde dev büyük harf ad, kuruluş yılı plakası, gerçek tabelalardaki gibi büyük telefon numarası
//     ve düğmeler; yanında (telefonda altında) menü kutusu renginde "Bugün ne yesek?" panosu: ustanın seçtikleri (yoksa
//     kategorilerin baştaki ürünleri) ad · fiyat satırlarıyla. Altında çini şerit.
// (2) "Nasıl istersiniz?": büyük seçim kutuları: Eve gelsin (online sipariş açıksa; mahallelerden en kısa süre ve alt
//     tutar), Masa ayırt, Hemen ara, Yol tarifi; verisi olan ilk üçü.
// (3) Vitrin: kapak fotoğrafı varsa kalın çerçeveli geniş şerit (fotoğrafsız da sayfa dolu).
// (4) Hazır menüler sarı ilan kâğıtları. (5) FİYAT LİSTESİ: kategoriler çini kenarlı panolar, duvar gibi sütun sütun.
// (6) Ustamız: kuruluş yılı mührü, usta portresi ya da baş harfleri, hikâye ve ustanın sözü. (7) Müşteri defteri
// (yorumlar). (8) "Buyurun" bandı. Alt bilgi çinili tezgâh (EsnafFrame). Verisi olmayan bölüm çizilmez.

const BOARD_CATEGORIES = 4;
const BOARD_ROWS = 7;

export default function EsnafHome({ site, mine }: DesignHomeProps) {
    const cart = useSiteCart();
    const edit = useSiteEdit();
    const mobileActions = useEsnafMobileActions(site, 'home');
    return (
        <SitePage site={site} current="home" mobileActions={mobileActions}>
            <main className="flex flex-1 flex-col">
                <Hero site={site} cart={cart} />
                {mine.length > 0 && <section className={cn(esWrap, 'pt-10')}><MyReservations items={mine} /></section>}
                {!edit && <Choices site={site} cart={cart} />}
                <Showcase site={site} />
                <ExternalHint source="setMenus"><SetMenus site={site} cart={cart} /></ExternalHint>
                <ExternalHint source="menu"><Board site={site} cart={cart} /></ExternalHint>
                <Usta site={site} />
                <Reviews site={site} />
                <CallBand site={site} />
                {edit && (
                    <div className={cn(esWrap, 'flex flex-col gap-4 py-10')}>
                        <EditorGallery site={site} />
                        <EditorVisit site={site} />
                    </div>
                )}
            </main>
        </SitePage>
    );
}

/** Sepete ekleme yardımcıları (ana sayfanın panoları). */
function useAdder(cart: SiteCart) {
    const [announce, setAnnounce] = useState('');
    const qty = (id: string) => cart.lines.filter(l => l.kind === 'product' && l.productId === id).reduce((s, l) => s + l.quantity, 0);
    const canAdd = (id: string) => { const d = cart.productFor(id); return cart.enabled && !!d && !d.isOutOfStock; };
    const add = (id: string, product: string) => { cart.addProduct(id); setAnnounce(`${product} sepete eklendi.`); };
    return { announce, qty, canAdd, add };
}

// ── 1. Tabela ────────────────────────────────────────────────────────────────────────────────────

function Hero({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    const canReserve = canReserveOnline(site);
    const actionsX = editExternal(edit, 'heroActions');
    const place = site.district || site.city;
    const picks = boardHighlights(site);

    const actions: { key: string; label: string; to?: string; href?: string }[] = [];
    if (cart.enabled) actions.push({ key: 'siparis', label: 'Sipariş ver', to: '/siparis' });
    if (productCount(site) > 0) actions.push({ key: 'menu', label: 'Fiyat listesi', to: '/menu' });
    if (canReserve) actions.push({ key: 'rez', label: 'Masa ayırt', to: RESERVATION_PATH });

    return (
        <section aria-labelledby="es-ad" className="rb-es-sign relative bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]">
            <div className={cn(esWrap, 'grid gap-10 pb-12 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:gap-14 lg:pb-16')}>
                <div className="flex min-w-0 flex-col items-start gap-6 [container-type:inline-size]">
                    {(c.foundedYear || place) && (
                        <EditableBlock target="year" label="Kuruluş yılı">
                            <p className="m-0 inline-flex flex-wrap items-center gap-x-3 rounded-[4px] border-2 border-[var(--site-on-cover)] px-3 py-1.5 text-[13px] font-extrabold uppercase tracking-[0.16em]">
                                {c.foundedYear && <span>{sinceYear(c.foundedYear)}</span>}
                                {c.foundedYear && place && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--site-pop)]" />}
                                {place && <span>{place}</span>}
                            </p>
                        </EditableBlock>
                    )}
                    <h1 id="es-ad" className={cn(esSign, 'w-full text-balance')} style={signFit(name, c.font)}>{name}</h1>
                    {(c.tagline || c.headline || showEmpty) && (
                        <EditableText as="p" field="tagline" value={c.tagline} fallback={c.headline} placeholder="Alt başlık yazın"
                            className="m-0 max-w-[40ch] text-[18px] font-semibold leading-snug sm:text-[21px]" />
                    )}
                    {site.phone && !edit && (
                        <ExternalHint source="restaurant">
                            <a href={telHref(site.phone)} className={cn(serif, 'inline-flex min-h-11 max-w-full items-center gap-3 break-all text-[34px] leading-none text-[var(--site-cover-accent)] no-underline tabular-nums decoration-[3px] underline-offset-8 hover:underline sm:text-[48px]')}>
                                <PhoneGlyph className="h-[0.78em] w-[0.78em] shrink-0" /><span className="sr-only">Ara: </span>{site.phone}
                            </a>
                        </ExternalHint>
                    )}
                    {!edit && actions.length > 0 && (
                        <div {...actionsX} className={cn(actionsX.className, 'flex w-full flex-col gap-3 sm:w-auto sm:flex-row')}>
                            {actions.slice(0, 2).map((a, i) => <Link key={a.key} to={a.to!} className={i === 0 ? esButton.pop : esButton.onSign}>{a.label}</Link>)}
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
                        <OpenLine site={site} dotClassName="ring-2 ring-[var(--site-on-cover)]" />
                        {c.rating !== null && (
                            <EditableBlock target="rating" label="Google puanı">
                                <p className="m-0">
                                    <span className="font-extrabold">Google {formatRating(c.rating)}</span>
                                    {c.reviewCount !== null && <>, {c.reviewCount.toLocaleString('tr-TR')} yorum</>}
                                </p>
                            </EditableBlock>
                        )}
                    </div>
                </div>
                {picks.length > 0 && <ExternalHint source="menu"><TodayBoard site={site} cart={cart} /></ExternalHint>}
            </div>
            <TileStrip />
        </section>
    );
}

/** "Bugün ne yesek?": menü kutusu renginde pano, kalın çerçeve, sarı fiyatlar. */
function TodayBoard({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const { announce, qty, canAdd, add } = useAdder(cart);
    const picks = boardHighlights(site);
    const featured = picks.some(p => p.isFeatured);
    return (
        <section aria-labelledby="es-bugun" className="rb-es-chalk relative min-w-0 rounded-md bg-[var(--site-menu-box)] px-5 pb-5 pt-6 text-[var(--site-on-menu-box)] sm:px-7 sm:pb-7">
            <h2 id="es-bugun" className={cn(serif, 'm-0 text-[40px] leading-[0.9] sm:text-[52px]')}>Bugün ne yesek?</h2>
            <p className="m-0 mt-2 text-[15px] text-[var(--site-on-menu-box-sub)]">{featured ? 'Ustanın seçtikleri.' : 'Menüden birkaç lezzet.'}</p>
            <ul className="m-0 mt-3 list-none p-0">
                {picks.map(p => (
                    <li key={p.id}>
                        <PriceRow tone="board" name={p.name} price={p.price}
                            action={canAdd(p.id) ? <AddSquare tone="board" name={p.name} quantity={qty(p.id)} onAdd={() => add(p.id, p.name)} /> : undefined} />
                    </li>
                ))}
            </ul>
            <Link to="/menu" className="mt-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-extrabold uppercase tracking-[0.04em] text-[var(--site-on-menu-box)] underline decoration-[var(--site-pop)] decoration-[3px] underline-offset-[6px]">
                Bütün fiyat listesi, {productCount(site)} çeşit
            </Link>
            <p className="sr-only" aria-live="polite">{announce}</p>
        </section>
    );
}

// ── 2. Nasıl istersiniz? ─────────────────────────────────────────────────────────────────────────

interface ChoiceTile { key: string; title: string; text: ReactNode; to?: string; href?: string; external?: boolean; tone: 'accent' | 'ink' | 'card' }

function Choices({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const ordering = useOnlineOrdering();
    const address = fullAddress(site);
    const tiles: ChoiceTile[] = [];
    if (cart.enabled) {
        const { minutes, minOrder } = deliveryFacts(ordering);
        const facts = [minutes ? `~${minutes} dk` : null, minOrder ? `en az ${formatSitePrice(minOrder)}` : null].filter(Boolean).join(' · ');
        const closed = ordering && !ordering.isOpen ? (ordering.message || 'Şu an sipariş alınmıyor') : null;
        tiles.push({ key: 'eve', title: 'Eve gelsin', to: '/siparis', tone: 'accent', text: closed ?? (facts ? `Paket sipariş · ${facts}` : 'Online paket sipariş') });
    }
    if (canReserveOnline(site)) tiles.push({ key: 'masa', title: 'Masa ayırt', to: RESERVATION_PATH, tone: tiles.length ? 'card' : 'accent', text: 'Gününü, saatini seçin; onaylanınca masanız hazır.' });
    if (site.phone) tiles.push({ key: 'ara', title: 'Hemen ara', href: telHref(site.phone), tone: 'ink', text: site.phone });
    if (address) tiles.push({ key: 'yol', title: 'Yol tarifi', href: directionsUrl(address), external: true, tone: 'card', text: site.openAddress || address });
    const shown = tiles.slice(0, 3);
    if (shown.length === 0) return null;

    const toneClass = (t: ChoiceTile['tone']) => t === 'accent'
        ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)] shadow-[inset_0_-6px_0_rgba(0,0,0,0.2)]'
        : t === 'ink' ? 'bg-[var(--site-paper)] text-[var(--site-on-paper)] shadow-[inset_0_-6px_0_rgba(0,0,0,0.35)]'
            : 'border-[3px] border-[var(--site-text)] bg-[var(--site-card)] text-[var(--site-text)]';

    return (
        <section aria-labelledby="es-secim" className={cn(esWrap, 'flex flex-col gap-6 py-12 sm:py-16')}>
            <h2 id="es-secim" className={cn(serif, 'm-0 text-[30px] leading-none sm:text-[38px]')}>Nasıl istersiniz?</h2>
            <ul className={cn('m-0 grid list-none gap-4 p-0', shown.length > 1 && 'sm:grid-cols-2', shown.length > 2 && 'lg:grid-cols-3')}>
                {shown.map(t => {
                    const body = (
                        <>
                            <span className={cn(serif, 'text-[44px] leading-[0.9] sm:text-[56px]')}>{t.title}</span>
                            <span className="mt-auto flex items-end justify-between gap-4 pt-6">
                                <span className="min-w-0 break-words text-[15px] font-semibold leading-snug opacity-90">{t.text}</span>
                                <svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                            </span>
                        </>
                    );
                    const cls = cn('group flex min-h-[188px] flex-col rounded-md p-5 no-underline sm:p-6', toneClass(t.tone));
                    return (
                        <li key={t.key} className="min-w-0">
                            {t.to ? <Link to={t.to} className={cls}>{body}</Link>
                                : <a href={t.href} target={t.external ? '_blank' : undefined} rel={t.external ? 'noopener noreferrer' : undefined} className={cls}>{body}</a>}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

// ── 3. Vitrin ────────────────────────────────────────────────────────────────────────────────────

function Showcase({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const photo = site.site.coverImageUrl;
    if (!photo) return edit?.showEmpty ? <div className={cn(esWrap, 'py-8')}><EmptySlot target="photo:cover" title="+ Vitrin fotoğrafı ekle (kapak)" className="min-h-[180px]" /></div> : null;
    return (
        <div className={cn(esWrap, 'pb-4', edit && 'pt-10')}>
            <EditableBlock target="photo:cover" label="Kapak fotoğrafı" chip="Fotoğrafı değiştir">
                <div className="relative overflow-hidden rounded-md border-[6px] border-[var(--site-text)]">
                    <img src={photo} alt="" className="block aspect-[16/9] w-full object-cover sm:aspect-[21/8]" />
                    {photo.includes('/shared/stock/') && <StockImageLabel className="bottom-3 right-3" />}
                </div>
            </EditableBlock>
        </div>
    );
}

// ── 4. Hazır menüler ─────────────────────────────────────────────────────────────────────────────

function SetMenus({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const menus = (site.setMenus ?? []).filter(m => m.isAvailable);
    if (menus.length === 0) return null;
    return (
        <section aria-labelledby="es-hazir" className={cn(esWrap, 'flex flex-col gap-8 py-12 sm:py-16')}>
            <EsHeading id="es-hazir" title="Hazır menüler" note="Birkaç lezzet bir arada, tek fiyat." />
            <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {menus.map(m => (
                    <li key={m.id} className="min-w-0">
                        <article className="rb-es-notice flex h-full flex-col gap-3 rounded-[4px] bg-[var(--site-mustard)] p-5 text-[var(--site-text)] sm:p-6">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className={cn(serif, 'm-0 min-w-0 break-words text-[30px] leading-[0.95]')}>{m.name}</h3>
                                {m.isFeatured && <span className="shrink-0 rounded-[4px] bg-[var(--site-text)] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--site-mustard)]">Ustanın seçimi</span>}
                            </div>
                            <SlotsSummary menu={m} className="text-[15px] leading-snug text-[var(--site-text)]" />
                            <div className="mt-auto flex items-end justify-between gap-3 border-t-2 border-dashed border-[var(--site-text)] pt-4">
                                <Link to="/menu#paket-menuler" className="inline-flex min-h-11 items-center text-[15px] font-extrabold uppercase tracking-[0.04em] text-[var(--site-text)] underline decoration-[3px] underline-offset-[6px]">{cart.enabled ? 'Menüyü seç' : 'Menüde gör'}</Link>
                                <span className={cn(serif, 'whitespace-nowrap text-[40px] leading-none tabular-nums')}>{formatSitePrice(m.price)}</span>
                            </div>
                        </article>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// ── 5. Fiyat listesi ─────────────────────────────────────────────────────────────────────────────

function Board({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const adder = useAdder(cart);
    const categories = site.categories.filter(c => c.products.length > 0).slice(0, BOARD_CATEGORIES);
    if (categories.length === 0) return null;
    const total = productCount(site);
    return (
        <section id="fiyatlar" aria-labelledby="es-fiyat" className={cn(esWrap, 'flex scroll-mt-24 flex-col gap-8 py-12 sm:py-16')}>
            <EsHeading id="es-fiyat" title="Fiyat listesi"
                aside={<Link to="/menu" className={esLink}>Bütün liste, {total} çeşit</Link>} />
            <div className="@container">
                <div className="columns-1 gap-5 @3xl:columns-2 @6xl:columns-3">
                    {categories.map(cat => <BoardPanel key={cat.id} category={cat} adder={adder} />)}
                </div>
            </div>
            {cart.enabled && (
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link to="/siparis" className={esButton.accent}>Sipariş ver</Link>
                    <Link to="/menu" className={esButton.ink}>Bütün fiyat listesi</Link>
                </div>
            )}
            <p className="sr-only" aria-live="polite">{adder.announce}</p>
        </section>
    );
}

function BoardPanel({ category, adder }: { category: PublicCategory; adder: ReturnType<typeof useAdder> }) {
    const items = category.products.slice(0, BOARD_ROWS);
    const more = category.products.length - items.length;
    const headId = `es-pano-${category.id}`;
    return (
        <section aria-labelledby={headId} className="rb-es-board mb-5 break-inside-avoid overflow-hidden rounded-md">
            <EsnafCategoryHeader id={headId} name={category.name} total={category.products.length} level="h3" />
            <ul className="m-0 list-none px-4 pb-1 sm:px-5 [&>li:last-child>div]:border-b-0">
                {items.map(p => (
                    <li key={p.id}>
                        <PriceRow name={p.name} price={p.price} description={p.description?.trim()} soldOut={p.isOutOfStock} featured={p.isFeatured}
                            action={adder.canAdd(p.id) ? <AddSquare name={p.name} quantity={adder.qty(p.id)} onAdd={() => adder.add(p.id, p.name)} /> : undefined} />
                    </li>
                ))}
            </ul>
            {more > 0 && (
                <Link to="/menu" className="flex min-h-12 items-center justify-center border-t-2 border-[var(--site-text)] bg-[var(--site-alt)] text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--site-text)] no-underline hover:bg-[var(--site-bg)]">
                    {category.name}: {more} çeşit daha
                </Link>
            )}
        </section>
    );
}

// ── 6. Ustamız ───────────────────────────────────────────────────────────────────────────────────

function Usta({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    if (!c.about && !c.founderQuote && !c.founderName && !showEmpty) return null;
    const photo = c.founderPhotoUrl || c.aboutImageUrl;
    const photoTarget = c.founderPhotoUrl ? 'photo:founder' : 'photo:about';
    const title = c.founderName ? 'Ustamız' : (c.storyTitle || 'Dükkânın hikâyesi');
    return (
        <section aria-labelledby="es-usta" className="border-y-[6px] border-[var(--site-text)] bg-[var(--site-alt)] py-14 sm:py-20">
            <div className={cn(esWrap, 'grid items-start gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14')}>
                <div className="relative mx-auto w-full max-w-[420px]">
                    <EditableBlock target={photoTarget} label="Usta fotoğrafı" chip="Fotoğrafı değiştir">
                        {photo ? (
                            <img src={photo} alt={c.founderName || ''} className="block aspect-[4/5] w-full rounded-md border-[6px] border-[var(--site-text)] object-cover" />
                        ) : (
                            <span aria-hidden="true" className={cn(serif, 'rb-es-tilesoft flex aspect-[4/5] w-full items-center justify-center rounded-md border-[6px] border-[var(--site-text)] text-[120px] leading-none text-[var(--site-text)]')}>
                                {c.founderName ? initials(c.founderName) : initials(restaurantName(site))}
                            </span>
                        )}
                    </EditableBlock>
                    {c.foundedYear && (
                        <EditableBlock target="year" label="Kuruluş yılı" className="absolute -bottom-8 -right-3 rounded-full sm:-right-8">
                            <YearStamp year={c.foundedYear} className="bg-[var(--site-alt)]" />
                        </EditableBlock>
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-6">
                    <h2 id="es-usta" className={cn(serif, 'm-0 text-[52px] leading-[0.9] sm:text-[72px]')}>{title}</h2>
                    {(c.founderName || showEmpty) && (
                        <p className="m-0 text-[19px] font-bold leading-snug">
                            <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" className="font-extrabold" />
                            {(c.founderTitle || edit) && <>, <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" className="font-semibold text-[var(--site-sub)]" /></>}
                        </p>
                    )}
                    {(c.about || showEmpty) && (
                        <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                            className={cn('m-0 max-w-[62ch] whitespace-pre-line text-[17px] leading-[1.7] text-[var(--site-sub)]', !edit && 'line-clamp-[8]')} />
                    )}
                    {(c.founderQuote || showEmpty) && (
                        <figure className="m-0 rounded-md border-[3px] border-dashed border-[var(--site-text)] bg-[var(--site-card)] p-5 sm:p-6">
                            <blockquote className={cn(serif, 'm-0 text-[28px] leading-[1.05] sm:text-[34px]')}>
                                “<EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />”
                            </blockquote>
                        </figure>
                    )}
                    {!edit && hasAboutPage(site) && <Link to="/hakkimizda" className={cn(esLink, 'self-start')}>Hikâyenin devamı</Link>}
                </div>
            </div>
        </section>
    );
}

// ── 7. Müşteri defteri ───────────────────────────────────────────────────────────────────────────

function Reviews({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    const reviews = c.featuredReviews;
    if (reviews.length === 0 && !edit?.showEmpty) return null;
    return (
        <section aria-labelledby="es-defter" className={cn(esWrap, 'flex flex-col gap-10 py-14 sm:py-20')}>
            <EsHeading id="es-defter" title="Müşteri defteri"
                aside={c.rating !== null && c.reviewsUrl && !edit
                    ? <a href={c.reviewsUrl} target="_blank" rel="noopener noreferrer" className={esLink}>Google {formatRating(c.rating)}{c.reviewCount !== null && `, ${c.reviewCount.toLocaleString('tr-TR')} yorum`}</a>
                    : undefined} />
            <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
                {reviews.slice(0, SITE_LIMITS.review.max).map((r, i) => (
                    <li key={i} className="rb-es-note min-w-0">
                        <ListCard list="reviews" index={i} count={reviews.length} label="Yorum" className="h-full">
                            <figure className="m-0 flex h-full flex-col gap-4 rounded-[4px] border-[3px] border-[var(--site-text)] bg-[var(--site-card)] p-5 pt-7 sm:p-6 sm:pt-8">
                                <blockquote className="m-0 text-[17px] font-medium leading-[1.55]">
                                    “<EditableText field={`review:${i}:text`} value={r.text} multiline placeholder="Yorum" />”
                                </blockquote>
                                <figcaption className="mt-auto border-t-2 border-dashed border-[var(--site-border-strong)] pt-3 text-sm text-[var(--site-sub)]">
                                    <EditableText field={`review:${i}:author`} value={r.author} placeholder="Ad" className={cn(serif, 'text-[20px] text-[var(--site-text)]')} />
                                    {(r.source || edit) && <> · <EditableText field={`review:${i}:source`} value={r.source} placeholder="Kaynak" /></>}
                                </figcaption>
                            </figure>
                        </ListCard>
                    </li>
                ))}
            </ul>
            <AddCard list="reviews" label="Yorum ekle" count={reviews.length} max={SITE_LIMITS.review.max} />
        </section>
    );
}
