import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicProduct } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { SitePage } from './site/SiteFrame';
import type { MobileAction } from './site/siteActions';
import { BagIcon, CalendarIcon, DirectionsIcon, PhoneIcon } from './site/SiteCards';
import { SlotsSummary } from './site/SiteSetMenus';
import { savingLabel } from './site/setMenuParts';
import { RESERVATION_PATH, serif } from './site/siteParts';
import { FAST_MINUTES, SET_MENUS_ID, useMenuView } from './site/useMenuView';
import { directionsUrl, formatSitePrice, resolveDesign, telHref } from './site/siteTheme';
import EliteMenu from './site/elite/EliteMenu';
import { fullAddress, restaurantName, useSite } from './site/useSite';
import { EditableText, ExternalHint } from './site/siteEdit';
import { useSiteEdit } from './site/siteEditContext';

// Restoran sitesinin menü sayfası (tasarım: "Renkli · Menü", basılı menü düzeni). Kum sayfada tek krem kutu: kapak
// renginde başlık bloğu (damalı desen; ad, dev "Menü", alt başlık, arama ve verisi varsa "Ustanın seçimi" / "10 dk ve
// altı" süzgeçleri), zeytin yapışkan kategori şeridi (görünen bölüm hardal alt çizgili), hardal "Hazır menüler" bandı ve
// kategoriler: iki sütunlu "Ad ······ fiyat" satırları (fotoğraf varsa hardal çerçeveli yuvarlak, yoksa yalnız yazı).
// Online sipariş açıkken + düğmeleri ve sepette ürün varken altta yapışkan sepet çubuğu. Sıra admin'deki sıradır.

export default function RestaurantMenuPage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    const [announce, setAnnounce] = useState('');
    const cart = useSiteCart();
    const canOrder = cart.enabled;

    const {
        query, setQuery, onlyFeatured, setOnlyFeatured, onlyFast, setOnlyFast, products, groups, setMenus, nav, active, strip,
    } = useMenuView(site);

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }
    if (resolveDesign(site.site.design) === 'elit') return <EliteMenu site={site} />;

    const name = restaurantName(site);
    const canReserve = canReserveOnline(site);
    const address = fullAddress(site);
    const hasFeatured = products.some(p => p.isFeatured);
    const hasFast = products.some(p => !!p.prepMinutes && p.prepMinutes <= FAST_MINUTES);
    const nothingFound = groups.length === 0 && setMenus.length === 0;
    const menuEmpty = site.categories.length === 0 && (site.setMenus ?? []).length === 0;
    const onAdded = (product: string) => setAnnounce(`${product} sepete eklendi.`);
    const showCartBar = canOrder && cart.count > 0 && !edit;

    // Telefonun alt çubuğu: sepette ürün varken yerini sepet çubuğu alır; yoksa Ara · (Paket sipariş | Masa ayırt | Yol tarifi).
    const mobileActions: MobileAction[] = [];
    if (!showCartBar) {
        if (site.phone) mobileActions.push({ key: 'ara', label: 'Ara', icon: <PhoneIcon className="h-[18px] w-[18px]" />, href: telHref(site.phone) });
        if (canOrder) mobileActions.push({ key: 'paket', label: 'Paket sipariş', icon: <BagIcon className="h-[18px] w-[18px]" />, to: '/siparis', primary: true });
        else if (canReserve) mobileActions.push({ key: 'rez', label: 'Masa ayırt', icon: <CalendarIcon className="h-[18px] w-[18px]" />, to: RESERVATION_PATH, primary: true });
        else if (address) mobileActions.push({ key: 'yol', label: 'Yol tarifi', icon: <DirectionsIcon className="h-[18px] w-[18px]" />, href: directionsUrl(address) });
    }

    const chip = (on: boolean) => cn('inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors',
        on ? 'border-[var(--site-pop)] bg-[var(--site-pop)] text-[var(--site-on-pop)]' : 'border-[color-mix(in_srgb,var(--site-on-cover)_45%,transparent)] text-[var(--site-on-cover)] hover:border-[var(--site-on-cover)]');

    return (
        // Başlık sayfayla kayar (stickyHeader={false}); üstte yapışık kalan yalnız kategori şeridi.
        <SitePage site={site} current="menu" stickyHeader={false} mobileActions={mobileActions}>
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                <section aria-labelledby="mn-baslik" className="rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[36px]">
                    {/* Kapak bloğu: temanın kapak renginde, damalı desen; ad, dev "Menü", alt başlık, arama ve süzgeçler. */}
                    <div className="relative flex flex-col items-center gap-[18px] overflow-hidden rounded-t-[24px] bg-[var(--site-cover-bg)] px-5 pb-12 md:rounded-t-[36px] pt-14 text-center text-[var(--site-on-cover)] sm:px-14 md:pb-14 md:pt-[72px]">
                        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[repeating-conic-gradient(from_45deg,color-mix(in_srgb,var(--site-on-cover)_7%,transparent)_0_25%,transparent_0_50%)] bg-[length:34px_34px]" />
                        <span className="relative text-xs font-extrabold uppercase tracking-[0.3em] text-[var(--site-cover-accent)]">{name}</span>
                        <h1 id="mn-baslik" className={cn(serif, 'relative m-0 text-[88px] font-extrabold leading-[0.85] tracking-[-0.03em] md:text-[clamp(88px,10vw,156px)]')}>Menü</h1>
                        {(site.site.tagline || edit?.showEmpty) && (
                            <EditableText field="tagline" value={site.site.tagline} placeholder="Alt başlık yazın"
                                className={cn(serif, 'relative max-w-full text-xl font-semibold italic text-[var(--site-cover-accent)] md:text-2xl')} />
                        )}
                        {!edit && !menuEmpty && (
                            <div className="relative mt-3 flex w-full flex-col items-center gap-3.5">
                                <label className="flex h-[58px] w-full max-w-[480px] items-center gap-3 rounded-full bg-[var(--site-menu-card)] px-[22px] text-[var(--site-text)] focus-within:ring-2 focus-within:ring-[var(--site-mustard)]">
                                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--site-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                                    <span className="sr-only">Menüde ara</span>
                                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ne canınız çekti?"
                                        className="min-w-0 flex-1 border-0 bg-transparent text-base text-[var(--site-text)] outline-none placeholder:text-[var(--site-muted)]" />
                                </label>
                                {(hasFeatured || hasFast) && (
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {hasFeatured && <button type="button" aria-pressed={onlyFeatured} onClick={() => setOnlyFeatured(v => !v)} className={chip(onlyFeatured)}><span aria-hidden="true">★</span>Ustanın seçimi</button>}
                                        {hasFast && <button type="button" aria-pressed={onlyFast} onClick={() => setOnlyFast(v => !v)} className={chip(onlyFast)}><span aria-hidden="true">⏱</span>{FAST_MINUTES} dk ve altı</button>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <ExternalHint source="menu">
                        {/* Yapışkan kategori şeridi (zeytin; görünen bölüm hardal alt çizgili) */}
                        {nav.length > 1 && (
                            <nav aria-label="Kategoriler" className="sticky top-0 z-[4] border-y border-[color-mix(in_srgb,var(--site-on-menu-box)_8%,transparent)] bg-[var(--site-menu-box)]">
                                <div ref={strip} className="overflow-x-auto px-5 [scrollbar-width:none] sm:px-10">
                                    <div className="mx-auto flex w-max gap-6 md:gap-[30px]">
                                        {nav.map(n => {
                                            const on = active === n.id;
                                            return (
                                                <a key={n.id} href={`#${n.id}`} data-nav={n.id} aria-current={on ? 'location' : undefined}
                                                    className={cn('inline-flex min-h-[54px] shrink-0 items-center whitespace-nowrap border-b-[3px] px-0.5 pt-[3px] text-[15px] no-underline transition-colors',
                                                        on ? 'border-[var(--site-pop)] font-extrabold text-[var(--site-on-menu-box)]' : 'border-transparent font-semibold text-[var(--site-on-menu-box-sub)] hover:text-[var(--site-on-menu-box)]')}>
                                                    {n.label}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            </nav>
                        )}

                        <div className="px-5 pb-12 pt-2 sm:px-10 lg:px-16 lg:pb-[72px]">
                            {menuEmpty ? (
                                <p className="m-0 pt-14 text-center text-lg text-[var(--site-muted)]">Menü henüz hazırlanıyor.</p>
                            ) : nothingFound && (
                                <div className="flex flex-col items-center gap-2 py-14 text-center">
                                    <span className={cn(serif, 'text-[36px] leading-tight')}>{query.trim() ? `“${query.trim()}” için sonuç yok` : 'Sonuç yok'}</span>
                                    <span className="text-[var(--site-sub)]">Farklı bir kelime deneyin ya da süzgeçleri kaldırın.</span>
                                </div>
                            )}

                            {setMenus.length > 0 && (
                                <ExternalHint source="setMenus">
                                    <section id={SET_MENUS_ID} aria-labelledby="mn-hazir"
                                        className="mt-12 flex scroll-mt-16 flex-col gap-[26px] rounded-[24px] bg-[var(--site-mustard)] px-5 pb-10 pt-8 text-[var(--site-text)] [--site-accent-text:currentColor] sm:px-10 md:mt-14 md:rounded-[32px] lg:-mx-6 lg:px-12 lg:pt-10">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                                            <h2 id="mn-hazir" className={cn(serif, 'm-0 text-[42px] font-extrabold leading-none md:text-[50px]')}>Hazır <em className="rb-accent italic">menüler</em></h2>
                                            <span className="text-sm font-bold">{setMenus.length} menü</span>
                                        </div>
                                        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-x-12 gap-y-[22px] p-0">
                                            {setMenus.map(menu => <SetMenuLine key={menu.id} menu={menu} cart={cart} />)}
                                        </ul>
                                    </section>
                                </ExternalHint>
                            )}

                            {groups.map(g => (
                                <section key={g.id} id={g.id} aria-labelledby={`${g.id}-baslik`} className="flex scroll-mt-16 flex-col gap-[30px] pt-14 md:pt-[72px]">
                                    <SectionTitle id={`${g.id}-baslik`} title={g.category.name} note={`${g.items.length} ürün`} />
                                    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-x-14 gap-y-6 p-0">
                                        {g.items.map(p => <ProductLine key={p.id} product={p} cart={cart} onAdded={onAdded} />)}
                                    </ul>
                                </section>
                            ))}
                            <p className="sr-only" aria-live="polite">{announce}</p>
                        </div>
                    </ExternalHint>
                </section>

                {showCartBar && (
                    <div className="pointer-events-none sticky bottom-4 z-[5] flex justify-center">
                        <Link to="/siparis" aria-label={`Sepete git: ${cart.count} ürün, ${formatSitePrice(cart.subtotal)}`}
                            className="pointer-events-auto flex h-[66px] max-w-full items-center gap-3 rounded-full bg-[var(--site-paper)] py-2 pl-5 pr-2 text-[var(--site-on-paper)] no-underline shadow-[0_16px_40px_rgba(36,24,15,0.35)] sm:gap-[18px] sm:pl-6">
                            <span className="inline-flex items-center gap-2.5 whitespace-nowrap font-bold">
                                <span className="inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-[var(--site-mustard)] px-2 text-[13px] font-extrabold tabular-nums text-[var(--site-text)]">{cart.count}</span>
                                <span className="hidden sm:inline">ürün sepette</span>
                            </span>
                            <span aria-hidden="true" className="h-6 w-px bg-[rgba(246,241,233,0.2)]" />
                            <span className={cn(serif, 'whitespace-nowrap text-[24px] tabular-nums sm:text-[26px]')}>{formatSitePrice(cart.subtotal)}</span>
                            <span className="inline-flex h-[50px] items-center whitespace-nowrap rounded-full bg-[var(--site-accent)] px-6 font-extrabold text-[var(--site-on-accent)]">Sepete git →</span>
                        </Link>
                    </div>
                )}
            </main>
        </SitePage>
    );
}

/** Bölüm başlığı: iki yanında hardal kesikli çizgi ve vurgu renginde elmas, ortada kalın ad; altında kısa not (ürün sayısı). */
function SectionTitle({ id, title, note }: { id: string; title: string; note: string }) {
    const dash = 'h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,var(--site-mustard)_0_10px,transparent_10px_18px)]';
    const diamond = 'h-3 w-3 shrink-0 rotate-45 bg-[var(--site-accent-text)]';
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex w-full items-center gap-3 md:gap-[18px]">
                <span aria-hidden="true" className={dash} />
                <span aria-hidden="true" className={diamond} />
                <h2 id={id} className={cn(serif, 'm-0 max-w-[75%] break-words text-center text-[38px] leading-none md:text-[50px]')}>{title}</h2>
                <span aria-hidden="true" className={diamond} />
                <span aria-hidden="true" className={dash} />
            </div>
            <span className={cn(serif, 'text-lg font-medium italic text-[var(--site-accent-text)]')}>{note}</span>
        </div>
    );
}

/** "+" düğmesi; sepetteyse vurgu renginde "2 ✓". Online sipariş kapalıysa ya da ürün pakette yoksa çizilmez. */
function LineButton({ label, qty, onClick }: { label: string; qty: number; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-label={qty > 0 ? `${label} (sepette ${qty})` : label}
            className={cn('flex h-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90',
                qty > 0 ? 'min-w-11 bg-[var(--site-accent)] px-3 text-sm font-extrabold text-[var(--site-on-accent)]' : 'w-11 bg-[var(--site-bg)] text-[22px] leading-none text-[var(--site-text)]')}>
            {qty > 0 ? <span className="tabular-nums">{qty} ✓</span> : <span aria-hidden="true">+</span>}
        </button>
    );
}

function ProductLine({ product, cart, onAdded }: { product: PublicProduct; cart: SiteCart; onAdded: (name: string) => void }) {
    const meta = [product.description?.trim(), product.prepMinutes ? `~${product.prepMinutes} dk` : null].filter(Boolean).join(' · ');
    const tag = product.isOutOfStock ? 'şu an tükendi' : product.isFeatured ? 'ustanın seçimi' : null;
    const delivery = cart.enabled ? cart.productFor(product.id) : undefined;
    const addable = !!delivery && !delivery.isOutOfStock && !product.isOutOfStock;
    const qty = cart.lines.filter(l => l.kind === 'product' && l.productId === product.id).reduce((s, l) => s + l.quantity, 0);
    return (
        <li className="flex min-w-0 items-center gap-4">
            {product.imageUrl && (
                <span className="relative shrink-0">
                    <img src={product.imageUrl} alt={product.name} title={product.isStockImage ? 'Temsili görsel' : undefined} loading="lazy" className="block h-[62px] w-[62px] rounded-full border-[3px] border-[var(--site-mustard)] bg-[var(--site-placeholder)] object-cover" />
                    {product.isStockImage && <span className="sr-only"> (temsili görsel)</span>}
                </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline gap-2.5">
                    <h3 className={cn(serif, 'm-0 min-w-0 break-words text-[21px] leading-[1.15] md:text-[23px]', product.isOutOfStock && 'text-[var(--site-muted)]')}>{product.name}</h3>
                    <span aria-hidden="true" className="min-w-5 flex-1 -translate-y-1.5 border-b-2 border-dotted border-[color-mix(in_srgb,var(--site-terracotta-text)_35%,transparent)]" />
                    <span className="shrink-0 whitespace-nowrap text-lg font-extrabold tabular-nums text-[var(--site-accent-text)]">{formatSitePrice(product.price)}</span>
                </div>
                {(meta || tag) && (
                    <p className="m-0 text-[13px] leading-snug text-[var(--site-muted)]">
                        {meta}
                        {tag && (product.isOutOfStock
                            ? <span className="font-bold">{meta ? ' · ' : ''}{tag}</span>
                            : <span className={cn('inline-block rounded-full bg-[var(--site-menu-box)] px-[9px] py-px text-xs font-bold text-[var(--site-on-menu-box)]', meta && 'ml-2')}><span aria-hidden="true">★ </span>{tag}</span>)}
                    </p>
                )}
            </div>
            {cart.enabled && (addable
                ? <LineButton label={`${product.name} sepete ekle`} qty={qty} onClick={() => { cart.addProduct(product.id); onAdded(product.name); }} />
                : <span aria-hidden="true" className="w-11 shrink-0" />)}
        </li>
    );
}

function SetMenuLine({ menu, cart }: { menu: OnlineSetMenu; cart: SiteCart }) {
    const saving = savingLabel(menu);
    const found = cart.enabled ? cart.setMenuFor(menu.id) : undefined;
    const qty = cart.lines.filter(l => l.kind === 'setMenu' && l.setMenuId === menu.id).reduce((s, l) => s + l.quantity, 0);
    let action: ReactNode = null;
    if (!menu.isAvailable) action = <span className="shrink-0 pt-1 text-sm font-bold">Tükendi</span>;
    else if (found?.menu.isAvailable) {
        action = found.needsChoice
            ? <Link to="/siparis" aria-label={`${menu.name}: seçerek sepete ekle`} className="inline-flex h-11 shrink-0 items-center rounded-full bg-[var(--site-paper)] px-4 text-sm font-bold text-[var(--site-on-paper)] no-underline hover:opacity-90">Seç</Link>
            : <LineButton label={`${menu.name} sepete ekle`} qty={qty} onClick={() => cart.addSetMenu(menu.id)} />;
    }
    return (
        <li className="flex min-w-0 items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline gap-2.5">
                    <h3 className={cn(serif, 'm-0 min-w-0 break-words text-[23px] leading-[1.1] md:text-[25px]')}>{menu.name}</h3>
                    <span aria-hidden="true" className="min-w-5 flex-1 -translate-y-1.5 border-b-2 border-dotted border-[rgba(36,24,15,0.35)]" />
                    <span className="shrink-0 whitespace-nowrap">
                        {saving && <s className="mr-1.5 text-[13px] text-[#3A2A1C]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}
                        <span className="text-lg font-extrabold tabular-nums">{saving && <span className="sr-only">Menü fiyatı </span>}{formatSitePrice(menu.price)}</span>
                    </span>
                </div>
                <div className="text-[13px] leading-[1.55] text-[#3A2A1C] [--site-muted:#3A2A1C]">
                    {saving && <span className="mr-1.5 inline-block rounded-full bg-[var(--site-paper)] px-2 py-px font-extrabold text-[var(--site-mustard)]">{saving}</span>}
                    {menu.description && <span>{menu.description} · </span>}
                    <SlotsSummary menu={menu} className="inline" />
                </div>
            </div>
            {action}
        </li>
    );
}
