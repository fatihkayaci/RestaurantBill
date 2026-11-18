import { useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import DeliveryMenu from './delivery/DeliveryMenu';
import DeliverySetMenuSheet from './delivery/DeliverySetMenuSheet';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { SitePage } from './site/SiteFrame';
import type { MobileAction } from './site/siteActions';
import { BagIcon, CalendarIcon, DirectionsIcon, PhoneIcon } from './site/SiteCards';
import { RESERVATION_PATH, serif } from './site/siteParts';
import { FAST_MINUTES, useMenuView } from './site/useMenuView';
import { directionsUrl, formatSitePrice, resolveDesign, telHref } from './site/siteTheme';
import EliteMenu from './site/elite/EliteMenu';
import { fullAddress, restaurantName, useSite } from './site/useSite';
import { EditableText, ExternalHint } from './site/siteEdit';
import { useSiteEdit } from './site/siteEditContext';

// Restoran sitesinin menü sayfası. Kum sayfada tek krem kutu: kapak renginde başlık bloğu (damalı desen; ad, dev "Menü",
// alt başlık, arama ve verisi varsa "Ustanın seçimi" / "10 dk ve altı" süzgeçleri), altında paket sipariş sayfasının
// (/siparis) AYNI menüsü (DeliveryMenu): yapışkan kategori şeridi, "Menüler" bölümü, fotoğraflı kartlar, −/+ adet ve
// hazır menü seçim penceresi (DeliverySetMenuSheet). Sepet /siparis ile ortaktır (useSiteCart). Online sipariş kapalıysa
// ya da düzenleme önizlemesinde kartlar yalnız göz atmalıktır; paket menüsünde olmayan ürün/menü eklenemez.
// Sepette ürün varken altta yapışkan sepet çubuğu. Sıra admin'deki sıradır.

export default function RestaurantMenuPage() {
    const { site, error } = useSite();
    const edit = useSiteEdit();
    const [setMenuOpen, setSetMenuOpen] = useState<OnlineSetMenu | null>(null);
    const cart = useSiteCart();
    const canOrder = cart.enabled;

    const {
        query, setQuery, onlyFeatured, setOnlyFeatured, onlyFast, setOnlyFast, products, groups, setMenus,
    } = useMenuView(site);

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }
    if (resolveDesign(site.site.design) === 'elit') return <EliteMenu site={site} />;

    const name = restaurantName(site);
    const canReserve = canReserveOnline(site);
    const address = fullAddress(site);
    const hasFeatured = products.some(p => p.isFeatured) || (site.setMenus ?? []).some(m => m.isFeatured);
    const hasFast = products.some(p => !!p.prepMinutes && p.prepMinutes <= FAST_MINUTES);
    const nothingFound = groups.length === 0 && setMenus.length === 0;
    const menuEmpty = site.categories.length === 0 && (site.setMenus ?? []).length === 0;
    const readOnly = !canOrder || !!edit;
    const categories = groups.map(g => ({ ...g.category, products: g.items }));
    const productQty = (id: string) => cart.lines.filter(l => l.kind === 'product' && l.productId === id).reduce((s, l) => s + l.quantity, 0);
    const setMenuQty = (id: string) => cart.lines.filter(l => l.kind === 'setMenu' && l.setMenuId === id).reduce((s, l) => s + l.quantity, 0);
    // Pencere paket menüsündeki karşılığıyla açılır (fiyat ve seçenek stoğu oradan).
    const sheetMenu = setMenuOpen ? cart.setMenuFor(setMenuOpen.id)?.menu : undefined;
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
                        <div className="p-4 sm:p-8 lg:p-12">
                            {menuEmpty ? (
                                <p className="m-0 py-14 text-center text-lg text-[var(--site-muted)]">Menü henüz hazırlanıyor.</p>
                            ) : (
                                <DeliveryMenu
                                    categories={categories}
                                    setMenus={setMenus}
                                    restaurant={name}
                                    productQuantity={productQty}
                                    setMenuQuantity={setMenuQty}
                                    onAddProduct={p => cart.addProduct(p.id)}
                                    onRemoveProduct={p => cart.removeProduct(p.id)}
                                    onOpenSetMenu={setSetMenuOpen}
                                    onRemoveSetMenu={m => cart.removeSetMenu(m.id)}
                                    readOnly={readOnly}
                                    canAddProduct={p => { const d = cart.productFor(p.id); return !!d && !d.isOutOfStock; }}
                                    canAddSetMenu={m => !!cart.setMenuFor(m.id)?.menu.isAvailable}
                                    empty={nothingFound && (
                                        <div className="flex flex-col items-center gap-2 py-14 text-center">
                                            <span className={cn(serif, 'text-[36px] leading-tight')}>{query.trim() ? `“${query.trim()}” için sonuç yok` : 'Sonuç yok'}</span>
                                            <span className="text-[var(--site-sub)]">Farklı bir kelime deneyin ya da süzgeçleri kaldırın.</span>
                                        </div>
                                    )}
                                />
                            )}
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

            {sheetMenu && (
                <DeliverySetMenuSheet
                    menu={sheetMenu}
                    restaurant={name}
                    onClose={() => setSetMenuOpen(null)}
                    onAdd={(selections, quantity, note) => { cart.addSetMenuWith(sheetMenu.id, selections, quantity, note); setSetMenuOpen(null); }}
                />
            )}
        </SitePage>
    );
}
