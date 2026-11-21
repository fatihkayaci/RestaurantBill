import { useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { MyReservations } from '../../SiteChrome';
import { SitePage } from '../../SiteFrame';
import { EditorGallery, EditorVisit } from '../../EditorExtras';
import { RESERVATION_PATH, formatRating, hasAboutPage, productCount, serif, sinceYear } from '../../siteParts';
import { formatSitePrice, resolveFont, telHref } from '../../siteTheme';
import { restaurantName } from '../../useSite';
import { AddCard, EditableBlock, EditableText, ExternalHint, ListCard } from '../../siteEdit';
import { SITE_LIMITS, editExternal, useSiteEdit } from '../../siteEditContext';
import type { DesignHomeProps } from '../registry';
import { BhHeading, DrawnPlate, MorningChip, Sprig, WeekendCard } from './BahceBits';
import { BahceItems } from './BahceMenuParts';
import { Sofra } from './Sofra';
import { bhButton, bhDisplay, bhLink, bhWrap, nameStyle, setMenuItems, starSetMenu } from './bahceParts';

// Bahçe Kahvaltısı ana sayfası. Ortak düzenin kutularından ayrı, bahçede kurulmuş bir kahvaltı sofrası gibi akar:
// (1) Kapak: solda güneş ışığında kalın grotesk ad, "Sabahtan açık 08:00 – 14:00" çipi (gerçek saatten; hafta sonu
//     farklıysa yanında), alt başlık ve düğmeler; sağda (telefonda altta) YUKARIDAN BAKILMIŞ SOFRA: kapak renginde
//     yuvarlak masa, ortada kapak fotoğrafı büyük tabakta, çevresinde ürün fotoğrafları (yoksa çizimli tabaklar), çay.
// (2) "Sofranın yıldızı": serpme/kahvaltı adlı (yoksa öne çıkan) hazır menü büyük kartta: yuvarlak tabak fotoğrafı,
//     masaya gelenler çip çip, tereyağı fiyat damgası; öteki hazır menüler altında küçük kartlar.
// (3) "Bugün masada": kareli masa örtüsünün üstünde beyaz bir kâğıt: kategori çipleri (seçilebilir) ve iki sütun yuvarlak
//     tabaklı ürün kartları; tüm menü bağlantısı. (4) Bahçe hikâyesi: organik (damla) biçimli fotoğraf, yaprak dalı,
//     hikâye ve ustanın sözü. (5) "Sofradan notlar": yorumlar peçete kartlarında. (6) Hafta sonu "Sofranızı ayırtın"
//     tereyağı kartı (yaklaşan Cumartesi/Pazar'ın gerçek saatleri). Alt bilgi çalı kenarlı bahçe (BahceFrame).

const MENU_MAX = 6;

export default function BahceHome({ site, mine }: DesignHomeProps) {
    const cart = useSiteCart();
    const edit = useSiteEdit();
    return (
        <SitePage site={site} current="home">
            <main className="flex flex-1 flex-col">
                <Hero site={site} cart={cart} />
                {mine.length > 0 && <section className={cn(bhWrap, 'pb-10')}><MyReservations items={mine} /></section>}
                <ExternalHint source="setMenus"><StarMenu site={site} cart={cart} /></ExternalHint>
                <ExternalHint source="menu"><OnTheTable site={site} cart={cart} /></ExternalHint>
                <Story site={site} />
                <Reviews site={site} />
                <WeekendCard site={site} />
                {edit && (
                    <div className={cn(bhWrap, 'flex flex-col gap-4 py-10')}>
                        <EditorGallery site={site} />
                        <EditorVisit site={site} />
                    </div>
                )}
            </main>
        </SitePage>
    );
}

// ── 1. Kapak: ad ve sofra ────────────────────────────────────────────────────────────────────────

function Hero({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    const name = restaurantName(site);
    const canReserve = canReserveOnline(site);
    const hasMenu = productCount(site) > 0;
    const actionsX = editExternal(edit, 'heroActions');
    const place = [site.district || site.city, c.foundedYear ? sinceYear(c.foundedYear) : null].filter(Boolean).join(', ');
    const charWidth = resolveFont(c.font, 'bahce').charWidth.bold;

    // Sabahın düğmeleri: masa ayırt > sipariş > menü; ikincisi kalanlardan ilki (yoksa telefon).
    const actions: { key: string; label: string; to?: string; href?: string }[] = [];
    if (canReserve) actions.push({ key: 'rez', label: 'Masa ayırt', to: RESERVATION_PATH });
    if (cart.enabled) actions.push({ key: 'siparis', label: 'Paket sipariş ver', to: '/siparis' });
    if (actions.length < 2 && hasMenu) actions.push({ key: 'menu', label: 'Menüye bak', to: '/menu' });
    if (actions.length < 2 && site.phone) actions.push({ key: 'ara', label: 'Hemen ara', href: telHref(site.phone) });

    return (
        <section id="ust" aria-labelledby="bh-ad" className="relative overflow-hidden">
            <span aria-hidden="true" className="rb-bh-sun pointer-events-none absolute -left-[12%] -top-[18%] h-[520px] w-[520px] rounded-full sm:h-[720px] sm:w-[720px]" />
            <div className={cn(bhWrap, 'relative grid items-center gap-8 pb-14 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:gap-10 lg:pb-20 lg:pt-14')}>
                <div className="@container flex min-w-0 flex-col items-start gap-6">
                    <MorningChip site={site} weekend />
                    <h1 id="bh-ad" className={cn(bhDisplay, 'w-full text-balance hyphens-auto')} style={nameStyle(name, charWidth)}>{name}</h1>
                    {place && !edit && <p className="m-0 -mt-2 text-[16px] font-semibold text-[var(--site-sub)]">{place}</p>}
                    {(c.tagline || c.headline || showEmpty) && (
                        <EditableText as="p" field="tagline" value={c.tagline} fallback={c.headline} placeholder="Alt başlık yazın"
                            className="m-0 max-w-[34ch] text-[19px] leading-[1.45] text-[var(--site-sub)] sm:text-[22px]" />
                    )}
                    {!edit && actions.length > 0 && (
                        <div {...actionsX} className={cn(actionsX.className, 'flex w-full flex-col gap-3 sm:w-auto sm:flex-row')}>
                            {actions.slice(0, 2).map((a, i) => {
                                const cls = i === 0 ? bhButton.accent : bhButton.soft;
                                return a.to ? <Link key={a.key} to={a.to} className={cls}>{a.label}</Link> : <a key={a.key} href={a.href} className={cls}>{a.label}</a>;
                            })}
                        </div>
                    )}
                    {c.rating !== null && (
                        <EditableBlock target="rating" label="Google puanı">
                            <p className="m-0 flex items-center gap-2 text-[15px] text-[var(--site-sub)]">
                                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--site-mustard)] text-[13px] font-extrabold text-[var(--site-text)]">★</span>
                                <span><span className="font-bold text-[var(--site-text)]">Google {formatRating(c.rating)}</span>{c.reviewCount !== null && <>, {c.reviewCount.toLocaleString('tr-TR')} yorum</>}</span>
                            </p>
                        </EditableBlock>
                    )}
                </div>
                <div className="relative">
                    <Sofra site={site} className="max-w-[440px] sm:max-w-[560px] lg:max-w-[620px]" />
                    <Sprig className="absolute -bottom-2 left-0 w-[120px] -rotate-[14deg] sm:w-[160px]" />
                </div>
            </div>
        </section>
    );
}

// ── 2. Sofranın yıldızı ────────────────────────────────────────────────────────────────────────

function StarMenu({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const menus = (site.setMenus ?? []).filter(m => m.isAvailable);
    const star = starSetMenu(menus);
    if (!star) return null;
    const others = menus.filter(m => m.id !== star.id).slice(0, 3);
    const items = setMenuItems(star);
    const cta = cart.enabled ? 'Menüyü seç' : 'Menüde gör';
    return (
        <section aria-labelledby="bh-yildiz" className={cn(bhWrap, 'flex flex-col gap-5 pb-16 sm:pb-24')}>
            <article className="relative grid overflow-hidden rounded-[40px] bg-[var(--site-menu-box)] text-[var(--site-on-menu-box)] md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="relative flex items-center justify-center px-6 pb-2 pt-10 md:py-12">
                    <span aria-hidden="true" className="rb-bh-cloth absolute inset-x-[10%] bottom-[8%] top-[18%] rotate-[-6deg] rounded-[32px] opacity-60 md:inset-y-[14%]" />
                    <div className="relative w-full max-w-[340px]">
                        {star.imageUrl ? (
                            <span className="rb-bh-plate relative block aspect-square overflow-hidden rounded-full p-[5%]">
                                <img src={star.imageUrl} alt={star.name} loading="lazy" className="block h-full w-full rounded-full object-cover" />
                                {star.isStockImage && <StockImageLabel className="bottom-[14%] right-[18%]" />}
                            </span>
                        ) : (
                            <span aria-hidden="true" className="grid grid-cols-2 gap-3">
                                {(['egg', 'tomato', 'olive', 'honey'] as const).map(k => <DrawnPlate key={k} kind={k} />)}
                            </span>
                        )}
                        <span className="absolute -right-2 -top-3 flex h-[104px] w-[104px] rotate-[10deg] flex-col items-center justify-center rounded-full bg-[var(--site-mustard)] text-center text-[var(--site-text)] shadow-[0_10px_22px_-12px_color-mix(in_srgb,var(--site-text)_60%,transparent)] sm:h-[120px] sm:w-[120px]">
                            <span className={cn(serif, 'text-[22px] leading-none tabular-nums tracking-[-0.03em] sm:text-[26px]')}>{formatSitePrice(star.price)}</span>
                            {star.regularPrice > star.price && <s className="mt-1 text-[12px] font-semibold tabular-nums"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(star.regularPrice)}</s>}
                        </span>
                    </div>
                </div>
                <div className="flex min-w-0 flex-col gap-5 px-6 pb-10 pt-6 sm:px-10 md:py-14 md:pl-4">
                    <p className="m-0 text-[15px] font-bold text-[var(--site-mustard)]">Sofranın yıldızı</p>
                    <h2 id="bh-yildiz" className={cn(bhDisplay, 'text-balance text-[40px] sm:text-[54px] lg:text-[64px]')}>{star.name}</h2>
                    {star.description?.trim() && <p className="m-0 max-w-[46ch] text-[17px] leading-relaxed text-[var(--site-on-menu-box-sub)]">{star.description}</p>}
                    {items.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                            <p className="m-0 text-sm font-semibold text-[var(--site-on-menu-box-sub)]">Masaya gelenler</p>
                            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                                {items.map((it, i) => (
                                    <li key={i} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--site-on-menu-box)_12%,transparent)] px-3.5 text-[15px] font-semibold">
                                        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--site-mustard)]" />{it}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                        <Link to="/menu#paket-menuler" className={bhButton.butter}>{cta}</Link>
                        {cart.enabled && <Link to="/siparis" className={cn(bhButton.soft, 'border-transparent')}>Paket sipariş ver</Link>}
                    </div>
                </div>
            </article>
            {others.length > 0 && (
                <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
                    {others.map(m => <li key={m.id}><SmallSetMenu menu={m} /></li>)}
                </ul>
            )}
        </section>
    );
}

function SmallSetMenu({ menu }: { menu: OnlineSetMenu }) {
    const items = setMenuItems(menu);
    return (
        <Link to="/menu#paket-menuler" className="flex h-full items-center gap-4 rounded-[28px] border border-[var(--site-border)] bg-[var(--site-card)] p-3 pr-5 text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-border-strong)]">
            {menu.imageUrl ? (
                <span className="rb-bh-plate block w-[76px] shrink-0 overflow-hidden rounded-full p-[6%]"><img src={menu.imageUrl} alt="" loading="lazy" className="block aspect-square w-full rounded-full object-cover" /></span>
            ) : <DrawnPlate kind="bread" className="w-[76px] shrink-0" />}
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn(serif, 'text-[19px] leading-tight tracking-[-0.02em]')}>{menu.name}</span>
                {items.length > 0 && <span className="line-clamp-1 text-sm text-[var(--site-sub)]">{items.join(' · ')}</span>}
                <span className="font-extrabold tabular-nums text-[var(--site-accent-text)]">{formatSitePrice(menu.price)}</span>
            </span>
        </Link>
    );
}

// ── 3. Bugün masada: kareli örtüde menüden seçme ─────────────────────────────────────────────────

function OnTheTable({ site, cart }: { site: PublicSite; cart: SiteCart }) {
    const filled = site.categories.filter(c => c.products.length > 0);
    const [picked, setPicked] = useState<string | null>(null);
    const [announce, setAnnounce] = useState('');
    if (filled.length === 0) return null;
    const tabs = filled.slice(0, 4);
    const current = tabs.find(t => t.id === picked) ?? tabs[0];
    const name = restaurantName(site);
    const total = productCount(site);
    const qty = (id: string) => cart.lines.filter(l => l.kind === 'product' && l.productId === id).reduce((s, l) => s + l.quantity, 0);
    const canAdd = (id: string) => { const d = cart.productFor(id); return cart.enabled && !!d && !d.isOutOfStock; };
    const more = current.products.length - MENU_MAX;

    return (
        <section aria-labelledby="bh-masa" className="rb-bh-cloth py-12 sm:py-20">
            <div className={bhWrap}>
                <div className="flex flex-col gap-7 rounded-[36px] bg-[var(--site-card)] p-5 shadow-[0_30px_60px_-40px_color-mix(in_srgb,var(--site-text)_55%,transparent)] sm:p-10">
                    <BhHeading id="bh-masa" title="Bugün masada"
                        aside={<Link to="/menu" className={bhLink}>Bütün menü, {total} çeşit</Link>} />
                    {tabs.length > 1 && (
                        <div role="group" aria-label="Kategori seçin" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {tabs.map(t => {
                                const on = t.id === current.id;
                                return (
                                    <button key={t.id} type="button" aria-pressed={on} onClick={() => setPicked(t.id)}
                                        className={cn('flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-bold transition-colors',
                                            on ? 'border-[var(--site-mustard)] bg-[var(--site-mustard)] text-[var(--site-text)]' : 'border-[var(--site-border)] text-[var(--site-sub)] hover:border-[var(--site-border-strong)] hover:text-[var(--site-text)]')}>
                                        {t.name}<span className="text-[13px] font-semibold tabular-nums opacity-70">{t.products.length}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <BahceItems restaurant={name} items={current.products.slice(0, MENU_MAX).map(p => ({
                        id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, isStockImage: p.isStockImage, description: p.description,
                        soldOut: p.isOutOfStock, featured: p.isFeatured, prepMinutes: p.prepMinutes, quantity: qty(p.id), readOnly: !canAdd(p.id),
                        onAdd: () => { cart.addProduct(p.id); setAnnounce(`${p.name} sepete eklendi.`); }, onRemove: () => cart.removeProduct(p.id),
                    }))} />
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {more > 0 ? <Link to="/menu" className={bhLink}>{current.name} bölümünde {more} çeşit daha</Link> : <span />}
                        {cart.enabled && <Link to="/siparis" className={bhButton.accent}>Paket sipariş ver</Link>}
                    </div>
                    <p className="sr-only" aria-live="polite">{announce}</p>
                </div>
            </div>
        </section>
    );
}

// ── 4. Bahçe hikâyesi ──────────────────────────────────────────────────────────────────────────

function Story({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const showEmpty = Boolean(edit?.showEmpty);
    const c = site.site;
    if (!c.about && !c.founderQuote && !showEmpty) return null;
    const photo = c.aboutImageUrl;
    return (
        <section aria-labelledby="bh-hikaye" className={cn(bhWrap, 'grid items-center gap-10 py-16 sm:py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16')}>
            <div className="relative mx-auto w-full max-w-[440px]">
                <EditableBlock target="photo:about" label="Hikâye fotoğrafı" chip="Fotoğrafı değiştir" className="rb-bh-blob">
                    {photo ? (
                        <img src={photo} alt="" className="rb-bh-blob block aspect-[5/6] w-full object-cover" />
                    ) : (
                        <span aria-hidden="true" className="rb-bh-blob rb-bh-cloth flex aspect-[5/6] w-full items-center justify-center">
                            <DrawnPlate kind="tea" className="w-[34%]" />
                        </span>
                    )}
                </EditableBlock>
                <span aria-hidden="true" className="absolute -bottom-5 -right-3 h-24 w-24 rounded-full bg-[var(--site-mustard)] sm:h-28 sm:w-28" />
                <Sprig className="absolute -left-6 top-6 w-[130px] -rotate-[24deg]" />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
                <h2 id="bh-hikaye" className={cn(bhDisplay, 'text-balance text-[38px] sm:text-[52px]')}>
                    {c.storyTitle || (c.foundedYear ? `${sinceYear(c.foundedYear)} kurulan sofra` : 'Bu sofranın hikâyesi')}
                </h2>
                {(c.about || showEmpty) && (
                    <EditableText as="p" field="about" value={c.about} multiline placeholder="Hikâyenizi yazın: nasıl başladınız, neyi farklı yapıyorsunuz."
                        className={cn('m-0 whitespace-pre-line text-[17px] leading-[1.75] text-[var(--site-sub)]', !edit && 'line-clamp-[8]')} />
                )}
                {(c.founderQuote || showEmpty) && (
                    <figure className="m-0 flex flex-col gap-3 rounded-[28px] bg-[var(--site-alt)] p-6">
                        <blockquote className={cn(serif, 'm-0 text-[22px] leading-[1.3] tracking-[-0.02em] sm:text-[26px]')}>
                            “<EditableText field="founderQuote" value={c.founderQuote} multiline placeholder="Ustanın tek cümlelik sözü" />”
                        </blockquote>
                        {(c.founderName || edit) && (
                            <figcaption className="text-[15px] text-[var(--site-sub)]">
                                <EditableText field="founderName" value={c.founderName} placeholder="Ustanın adı" className="font-bold text-[var(--site-text)]" />
                                {(c.founderTitle || edit) && <>, <EditableText field="founderTitle" value={c.founderTitle} placeholder="Unvanı" /></>}
                            </figcaption>
                        )}
                    </figure>
                )}
                {!edit && hasAboutPage(site) && <Link to="/hakkimizda" className={cn(bhLink, 'self-start')}>Hikâyenin devamı</Link>}
            </div>
        </section>
    );
}

// ── 5. Sofradan notlar ────────────────────────────────────────────────────────────────────────

function Reviews({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const c = site.site;
    const reviews = c.featuredReviews;
    if (reviews.length === 0 && !edit?.showEmpty) return null;
    return (
        <section aria-labelledby="bh-notlar" className={cn(bhWrap, 'flex flex-col gap-10 pb-16 sm:pb-24')}>
            <BhHeading id="bh-notlar" title="Sofradan notlar"
                aside={c.rating !== null && c.reviewsUrl && !edit
                    ? <a href={c.reviewsUrl} target="_blank" rel="noopener noreferrer" className={bhLink}>Google'da {formatRating(c.rating)}{c.reviewCount !== null && `, ${c.reviewCount.toLocaleString('tr-TR')} yorum`}</a>
                    : undefined} />
            <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
                {reviews.slice(0, SITE_LIMITS.review.max).map((r, i) => (
                    <li key={i} className={cn('min-w-0', i % 3 === 1 && 'md:translate-y-8')}>
                        <ListCard list="reviews" index={i} count={reviews.length} label="Yorum" className="h-full rounded-[30px]">
                            <figure className={cn('m-0 flex h-full flex-col gap-5 rounded-[30px] p-6 sm:p-7',
                                i % 3 === 1 ? 'bg-[var(--site-mustard)] text-[var(--site-text)]' : 'border border-[var(--site-border)] bg-[var(--site-card)]')}>
                                <blockquote className="m-0 text-[17px] leading-[1.6]">
                                    “<EditableText field={`review:${i}:text`} value={r.text} multiline placeholder="Yorum" />”
                                </blockquote>
                                <figcaption className="mt-auto flex items-center gap-3 text-sm">
                                    <DrawnPlate kind={(['tea', 'egg', 'honey'] as const)[i % 3]} className="w-9 shrink-0" />
                                    <span>
                                        <EditableText field={`review:${i}:author`} value={r.author} placeholder="Ad" className="font-bold" />
                                        {(r.source || edit) && <>, <EditableText field={`review:${i}:source`} value={r.source} placeholder="Kaynak" /></>}
                                    </span>
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
