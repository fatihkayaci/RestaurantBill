import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicCategory, type PublicSite } from '@/features/customerSite/types';
import { useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { MyReservations } from '../../SiteChrome';
import { SitePage } from '../../SiteFrame';
import { EditorGallery, EditorVisit } from '../../EditorExtras';
import { SlotsSummary } from '../../SiteSetMenus';
import { RESERVATION_PATH, formatRating, hasAboutPage, productCount, serif, sinceYear } from '../../siteParts';
import { formatSitePrice, resolveFont, splitAccent, telHref } from '../../siteTheme';
import { restaurantName } from '../../useSite';
import { AddCard, EditableBlock, EditableText, ExternalHint, ListCard } from '../../siteEdit';
import { SITE_LIMITS, editExternal, useSiteEdit } from '../../siteEditContext';
import type { DesignHomeProps } from '../registry';
import { LampString, MhHeading, NightBackdrop, Ornament, ReserveBand, TonightStrip } from './MeyhaneBits';
import { MezeTray } from './MezeTray';
import { isMezeCategory, mhButton, mhLeader, mhLink, mhNarrow, mhSign, mhUnderHeader, mhWrap, trayCategory } from './meyhaneParts';

// Meyhane Gecesi ana sayfası. Ortak düzenin kutularından ayrı bir akış, akşam bir meyhaneye girer gibi:
// (1) Tam genişlik gece kapağı: tepede lamba dizisi, fotoğraf (yoksa çini desenli kapak rengi) üstünde koyu perde,
//     ortada çift çizgili tabelada restoranın adı, alt başlık ve düğmeler; altında "Bu akşam açığız 18:00 – 02:00" şeridi.
// (2) "Bu akşamın sofrası": meze kategorisi TEPSİDE (yuvarlak kâseler), sonraki iki kategori basılı menü sütunlarında
//     (ad, noktalı çizgi, fiyat), tüm menü bağlantısı. (3) Hazır menüler basılı satırlarla.
// (4) Hikâye: kemer çerçeveli fotoğraf, kısa hikâye ve ustanın sözü. (5) Masalardan notlar (yorumlar).
// (6) "Masa ayırt" gece bandı. Alt bilgi adisyon fişi (MeyhaneFrame). Verisi olmayan bölüm çizilmez.

const TRAY_MAX = 10;
const LIST_MAX = 6;

export default function MeyhaneHome({ site, mine }: DesignHomeProps) {
    const cart = useSiteCart();
    const edit = useSiteEdit();
    return (
        <SitePage site={site} current="home">
            <main className="flex flex-1 flex-col">
                <Hero site={site} cart={cart} />
                {mine.length > 0 && <section className={cn(mhWrap, 'pt-12')}><MyReservations items={mine} /></section>}
                <ExternalHint source="menu"><Tonight site={site} cart={cart} /></ExternalHint>
                <ExternalHint source="setMenus"><SetMenus site={site} cart={cart} /></ExternalHint>
                <Story site={site} />
                <Reviews site={site} />
                <ReserveBand site={site} />
                {edit && (
                    <div className={cn(mhWrap, 'flex flex-col gap-4 py-10')}>
                        <EditorGallery site={site} />
                        <EditorVisit site={site} />
                    </div>
                )}
            </main>
        </SitePage>
    );
}

// ── 1. Gece kapağı ───────────────────────────────────────────────────────────────────────────────

/** Tabeladaki adın boyu: en uzun satır ekrana sığsın (yazı tipinin harf genişliğiyle). */
function signStyle(lines: string[], charWidth: number): CSSProperties {
    const longest = Math.max(4, ...lines.map(l => l.length));
    return { fontSize: `min(132px, max(44px, ${(74 / (longest * charWidth)).toFixed(2)}vw))` };
}

function Hero({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    const [first, accent] = splitAccent(name);
    const canReserve = canReserveOnline(site);
    const hasMenu = productCount(site) > 0;
    const actionsX = editExternal(edit, 'heroActions');
    const place = [site.district || site.city, c.foundedYear ? sinceYear(c.foundedYear) : null].filter(Boolean).join(', ');
    const charWidth = resolveFont(c.font, 'meyhane').charWidth.regular;

    // Akşamın düğmeleri: masa ayırt > sipariş > menü; ikincisi kalanlardan ilki (yoksa telefon).
    const actions: { key: string; label: string; to?: string; href?: string }[] = [];
    if (canReserve) actions.push({ key: 'rez', label: 'Masa ayırt', to: RESERVATION_PATH });
    if (cart.enabled) actions.push({ key: 'siparis', label: 'Paket sipariş ver', to: '/siparis' });
    if (actions.length < 2 && hasMenu) actions.push({ key: 'menu', label: 'Menüye bak', href: '#sofra' });
    if (actions.length < 2 && site.phone) actions.push({ key: 'ara', label: 'Hemen ara', href: telHref(site.phone) });

    return (
        <>
            <section id="ust" aria-labelledby="mh-ad" className={cn('relative isolate flex min-h-[min(92svh,860px)] flex-col justify-center overflow-hidden', !edit && mhUnderHeader)}>
                <NightBackdrop image={c.coverImageUrl} target="photo:cover" label="Kapak fotoğrafı" emptyHint="+ Kapak fotoğrafı ekle" />
                <LampString className="top-[76px] lg:top-[92px]" sag={42} />
                <div className="pointer-events-none relative z-[1] [&_[data-edit-target]]:pointer-events-auto mx-auto flex w-full max-w-[980px] flex-col items-center gap-7 px-4 pb-16 pt-[168px] text-center sm:px-8 lg:pt-[196px] [&_a]:pointer-events-auto [&_[data-edit-text]]:pointer-events-auto">
                    {/* Tabela: çift çizgi çerçeve, ortada ad (ikinci parça lamba ışığında). */}
                    <div className="relative w-full max-w-[860px] border border-[var(--site-accent-line)] px-4 py-9 outline outline-1 outline-offset-[7px] outline-[var(--site-border-mid)] sm:px-10 sm:py-12">
                        <h1 id="mh-ad" className={cn(mhSign, 'text-balance')} style={signStyle([first, accent], charWidth)}>
                            {first && <>{first}<br /></>}<em className="rb-accent not-italic">{accent}</em>
                        </h1>
                        {place && !edit && <p className="m-0 mt-5 text-[15px] text-[var(--site-sub)]">{place}</p>}
                    </div>
                    {(c.tagline || c.headline || showEmpty) && (
                        <EditableText as="p" field="tagline" value={c.tagline} fallback={c.headline} placeholder="Alt başlık yazın"
                            className={cn(serif, 'm-0 max-w-[30ch] text-[21px] leading-[1.35] text-[var(--site-text)] sm:text-[26px]')} />
                    )}
                    {!edit && actions.length > 0 && (
                        <div {...actionsX} className={cn(actionsX.className, 'flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row')}>
                            {actions.slice(0, 2).map((a, i) => {
                                const cls = i === 0 ? mhButton.lamp : mhButton.line;
                                return a.to ? <Link key={a.key} to={a.to} className={cls}>{a.label}</Link> : <a key={a.key} href={a.href} className={cls}>{a.label}</a>;
                            })}
                        </div>
                    )}
                    {c.rating !== null && (
                        <EditableBlock target="rating" label="Google puanı">
                            <p className="m-0 text-sm text-[var(--site-sub)]">
                                <span className="font-bold text-[var(--site-text)]">Google {formatRating(c.rating)}</span>
                                {c.reviewCount !== null && <>, {c.reviewCount.toLocaleString('tr-TR')} yorum</>}
                            </p>
                        </EditableBlock>
                    )}
                </div>
            </section>
            <div className="border-y border-[var(--site-border)] bg-[var(--site-hero-deep)] px-4 py-4 sm:py-5">
                <TonightStrip site={site} extra={!edit && site.phone ? <a href={telHref(site.phone)} className={cn(mhLink, 'min-h-0')}>{site.phone}</a> : null} />
            </div>
        </>
    );
}

// ── 2. Bu akşamın sofrası ────────────────────────────────────────────────────────────────────────

function Tonight({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const [announce, setAnnounce] = useState('');
    const tray = trayCategory(site);
    if (!tray) return null;
    const columns = site.categories.filter(c => c.id !== tray.id && c.products.length > 0).slice(0, 2);
    const total = productCount(site);
    const name = restaurantName(site);
    const qty = (id: string) => cart.lines.filter(l => l.kind === 'product' && l.productId === id).reduce((s, l) => s + l.quantity, 0);
    const canAdd = (id: string) => { const d = cart.productFor(id); return cart.enabled && !!d && !d.isOutOfStock; };
    const add = (id: string, product: string) => { cart.addProduct(id); setAnnounce(`${product} sepete eklendi.`); };

    return (
        <section id="sofra" aria-labelledby="mh-sofra" className={cn(mhWrap, 'flex scroll-mt-24 flex-col gap-12 py-16 sm:py-24')}>
            <MhHeading id="mh-sofra" title="Bu akşamın sofrası" note={isMezeCategory(tray.name) ? `Önce ${tray.name.toLocaleLowerCase('tr-TR')} gelir, sonra sohbet uzar.` : undefined} />
            <div className="flex flex-col gap-4">
                <h3 className={cn(serif, 'm-0 text-center text-[26px] leading-none text-[var(--site-accent-text)]')}>{tray.name}</h3>
                <MezeTray restaurant={name} items={tray.products.slice(0, TRAY_MAX).map(p => ({
                    id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, isStockImage: p.isStockImage, soldOut: p.isOutOfStock,
                    featured: p.isFeatured, quantity: qty(p.id), readOnly: !canAdd(p.id),
                    onAdd: () => add(p.id, p.name), onRemove: () => cart.removeProduct(p.id),
                }))} />
            </div>
            {columns.length > 0 && (
                <div className={cn('grid gap-x-16 gap-y-12', columns.length > 1 && 'lg:grid-cols-2')}>
                    {columns.map(col => <PrintedColumn key={col.id} category={col} cart={cart} qty={qty} canAdd={canAdd} onAdd={add} />)}
                </div>
            )}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link to="/menu" className={mhButton.line}>Bütün menü, {total} çeşit</Link>
                {cart.enabled && <Link to="/siparis" className={mhButton.lamp}>Paket sipariş ver</Link>}
            </div>
            <p className="sr-only" aria-live="polite">{announce}</p>
        </section>
    );
}

/** Basılı menü sütunu: ortalı kategori adı, satır satır ad · noktalı çizgi · fiyat, altında kısa açıklama. */
function PrintedColumn({ category, cart, qty, canAdd, onAdd }: {
    category: PublicCategory; cart: SiteCart; qty: (id: string) => number; canAdd: (id: string) => boolean; onAdd: (id: string, name: string) => void;
}) {
    const items = category.products.slice(0, LIST_MAX);
    const more = category.products.length - items.length;
    return (
        <div className="flex min-w-0 flex-col">
            <h3 className={cn(serif, 'm-0 border-b border-[var(--site-border-mid)] pb-3 text-center text-[26px] leading-none text-[var(--site-accent-text)]')}>{category.name}</h3>
            <ul className="m-0 list-none p-0">
                {items.map(p => {
                    const q = qty(p.id);
                    return (
                        <li key={p.id} className="flex items-start gap-3 border-b border-[var(--site-line)] py-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className={cn(serif, 'min-w-0 text-[19px] leading-tight', p.isOutOfStock && 'text-[var(--site-sub)]')}>{p.name}</span>
                                    <span aria-hidden="true" className={mhLeader} />
                                    <span className={cn(serif, 'shrink-0 whitespace-nowrap text-[19px] tabular-nums', p.isOutOfStock ? 'text-[var(--site-sub)] line-through decoration-1' : 'text-[var(--site-accent-text)]')}>{formatSitePrice(p.price)}</span>
                                </div>
                                {(p.description?.trim() || p.isOutOfStock) && (
                                    <p className="m-0 mt-1 line-clamp-2 text-sm leading-snug text-[var(--site-sub)]">{p.isOutOfStock ? 'Bugünlük bitti' : p.description}</p>
                                )}
                            </div>
                            {cart.enabled && canAdd(p.id) && (
                                <button type="button" onClick={() => onAdd(p.id, p.name)}
                                    aria-label={q > 0 ? `${p.name} sepete bir tane daha ekle (sepette ${q})` : `${p.name} sepete ekle`}
                                    className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[15px] font-bold tabular-nums transition-colors',
                                        q > 0 ? 'border-[var(--site-accent-text)] bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'border-[var(--site-accent-line)] text-[var(--site-accent-text)] hover:bg-[var(--site-accent)] hover:text-[var(--site-on-accent)]')}>
                                    {q > 0 ? q : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
            {more > 0 && <Link to="/menu" className={cn(mhLink, 'mt-3 self-center')}>{category.name} bölümünde {more} çeşit daha</Link>}
        </div>
    );
}

// ── 3. Hazır menüler ────────────────────────────────────────────────────────────────────────

function SetMenus({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const menus = (site.setMenus ?? []).filter(m => m.isAvailable);
    if (menus.length === 0) return null;
    return (
        <section aria-labelledby="mh-hazir" className={cn(mhNarrow, 'flex flex-col gap-8 pb-16 sm:pb-24')}>
            <MhHeading id="mh-hazir" title="Hazır menüler" note="Birkaç lezzet bir arada; seçimi size kalsın." />
            <ul className="m-0 flex list-none flex-col border-t border-[var(--site-border-mid)] p-0">
                {menus.map(m => (
                    <li key={m.id} className="flex flex-col gap-1.5 border-b border-[var(--site-border-mid)] py-5">
                        <div className="flex items-baseline gap-2">
                            <h3 className={cn(serif, 'm-0 min-w-0 text-[22px] leading-tight sm:text-[24px]')}>{m.name}</h3>
                            <span aria-hidden="true" className={mhLeader} />
                            <span className={cn(serif, 'shrink-0 whitespace-nowrap text-[22px] tabular-nums text-[var(--site-accent-text)]')}>{formatSitePrice(m.price)}</span>
                        </div>
                        <SlotsSummary menu={m} className="text-sm text-[var(--site-sub)]" />
                        <Link to="/menu#paket-menuler" className={cn(mhLink, 'self-start')}>{cart.enabled ? 'Menüyü seç' : 'Menüde gör'}</Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// ── 4. Hikâye ────────────────────────────────────────────────────────────────────────────────────

function Story({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    if (!c.about && !c.founderQuote && !showEmpty) return null;
    const photo = c.aboutImageUrl;
    return (
        <section aria-labelledby="mh-hikaye" className="relative overflow-hidden border-y border-[var(--site-border)] bg-[var(--site-alt)] py-16 sm:py-24">
            <div className={cn(mhWrap, 'grid items-center gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16')}>
                <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="rounded-t-full">
                    {photo ? (
                        <img src={photo} alt="" className="mx-auto block aspect-[4/5] w-full max-w-[420px] rounded-t-full border border-[var(--site-border-mid)] object-cover" />
                    ) : (
                        <div aria-hidden="true" className="rb-mh-tray mx-auto flex aspect-[4/5] w-full max-w-[420px] items-center justify-center rounded-t-full">
                            <LampGlyph />
                        </div>
                    )}
                </EditableBlock>
                <div className="flex min-w-0 flex-col gap-6">
                    <h2 id="mh-hikaye" className={cn(serif, 'm-0 text-[36px] leading-[1.05] sm:text-[48px]')}>
                        {c.storyTitle || (c.foundedYear ? `${sinceYear(c.foundedYear)} aynı sofra` : 'Bu sofranın hikâyesi')}
                    </h2>
                    {(c.about || showEmpty) && (
                        <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                            className={cn('m-0 whitespace-pre-line text-[17px] leading-[1.75] text-[var(--site-sub)]', !edit && 'line-clamp-[8]')} />
                    )}
                    {(c.founderQuote || showEmpty) && (
                        <figure className="m-0 flex flex-col gap-3 pt-2">
                            <Ornament className="justify-start" />
                            <blockquote className={cn(serif, 'm-0 text-[24px] leading-[1.3] sm:text-[28px]')}>
                                <EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />
                            </blockquote>
                            {(c.founderName || edit) && (
                                <figcaption className="text-[15px] text-[var(--site-sub)]">
                                    <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" className="font-bold text-[var(--site-text)]" />
                                    {(c.founderTitle || edit) && <>, <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" /></>}
                                </figcaption>
                            )}
                        </figure>
                    )}
                    {!edit && hasAboutPage(site) && <Link to="/hakkimizda" className={cn(mhLink, 'self-start')}>Hikâyenin devamı</Link>}
                </div>
            </div>
        </section>
    );
}

/** Fotoğrafsız hikâyenin kemerindeki büyük lamba çizimi. */
function LampGlyph() {
    return (
        <svg width="96" height="140" viewBox="0 0 96 140" fill="none" className="text-[var(--site-accent-text)]">
            <path d="M48 0v34" stroke="var(--site-border-strong)" strokeWidth="1.5" />
            <path d="M30 40h36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M22 70a26 26 0 0 1 52 0v18a26 26 0 0 1-52 0z" fill="currentColor" opacity="0.92" />
            <ellipse cx="48" cy="80" rx="40" ry="44" fill="currentColor" opacity="0.12" />
        </svg>
    );
}

// ── 5. Masalardan notlar ─────────────────────────────────────────────────────────────────────────

function Reviews({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    const reviews = c.featuredReviews;
    if (reviews.length === 0 && !edit?.showEmpty) return null;
    return (
        <section aria-labelledby="mh-notlar" className={cn(mhWrap, 'flex flex-col gap-10 py-16 sm:py-24')}>
            <MhHeading id="mh-notlar" title="Masalardan notlar"
                note={c.rating !== null && c.reviewsUrl && !edit
                    ? <a href={c.reviewsUrl} target="_blank" rel="noopener noreferrer" className={mhLink}>Google'da {formatRating(c.rating)}{c.reviewCount !== null && `, ${c.reviewCount.toLocaleString('tr-TR')} yorum`}</a>
                    : undefined} />
            <ul className="m-0 grid list-none gap-0 p-0 md:grid-cols-3">
                {reviews.slice(0, SITE_LIMITS.review.max).map((r, i) => (
                    <li key={i} className="min-w-0 border-t border-[var(--site-border-mid)] md:border-l md:border-t-0 md:first:border-l-0">
                        <ListCard list="reviews" index={i} count={reviews.length} label="Yorum" className="h-full rounded-none">
                            <figure className="m-0 flex h-full flex-col gap-4 py-7 md:px-8 md:py-2">
                                <blockquote className={cn(serif, 'm-0 text-[21px] leading-[1.4]')}>
                                    “<EditableText field={`review:${i}:text`} value={r.text} multiline placeholder="Yorum" />”
                                </blockquote>
                                <figcaption className="mt-auto text-sm text-[var(--site-sub)]">
                                    <EditableText field={`review:${i}:author`} value={r.author} placeholder="Ad" className="font-bold text-[var(--site-text)]" />
                                    {(r.source || edit) && <>, <EditableText field={`review:${i}:source`} value={r.source} placeholder="Kaynak" /></>}
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
