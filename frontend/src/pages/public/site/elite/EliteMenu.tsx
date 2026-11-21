import { useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import DeliveryMenu from '../../delivery/DeliveryMenu';
import DeliverySetMenuSheet from '../../delivery/DeliverySetMenuSheet';
import { cn } from '@/lib/utils';
import { SitePage } from '../SiteFrame';
import type { MobileAction } from '../siteActions';
import { BagIcon, CalendarIcon, DirectionsIcon, PhoneIcon } from '../SiteCards';
import { RESERVATION_PATH } from '../siteParts';
import { directionsUrl, formatSitePrice, telHref } from '../siteTheme';
import { fullAddress, restaurantName } from '../useSite';
import { EditableText, ExternalHint } from '../siteEdit';
import { useSiteEdit } from '../siteEditContext';
import { FAST_MINUTES, useMenuView } from '../useMenuView';
import { EliteHero } from './EliteBits';
import { EliteFlowStyle } from './EliteFlowStyle';
import { elItalic, elLabel, elSerif, heroLead } from './eliteParts';

// /menu, Elit (tasarım: EliteMenu). Tam genişlik kapak (Menü kapağı, yoksa sitenin kapağı; o da yoksa desenli koyu
// bant), krem sayfada ince çizgili arama ve verisi varsa "Ustanın seçimi" / "10 dk ve altı" süzgeçleri; altında paket
// sipariş sayfasının (/siparis) AYNI menüsü (DeliveryMenu, Elit akış giydirmesiyle `rb-el-flow`): kategori şeridi,
// "Menüler", fotoğraflı kartlar, −/+ adet ve hazır menü seçim penceresi. Sepet /siparis ile ortaktır. Sepette ürün
// varken altta koyu sepet çubuğu. Sıra admin'deki sıradır.

export default function EliteMenu({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const [setMenuOpen, setSetMenuOpen] = useState<OnlineSetMenu | null>(null);
    const {
        query, setQuery, onlyFeatured, setOnlyFeatured, onlyFast, setOnlyFast, products, groups, setMenus,
    } = useMenuView(site);

    const c = site.site;
    const canReserve = canReserveOnline(site);
    const address = fullAddress(site);
    const hasFeatured = products.some(p => p.isFeatured) || (site.setMenus ?? []).some(m => m.isFeatured);
    const hasFast = products.some(p => !!p.prepMinutes && p.prepMinutes <= FAST_MINUTES);
    const nothingFound = groups.length === 0 && setMenus.length === 0;
    const menuEmpty = site.categories.length === 0 && (site.setMenus ?? []).length === 0;
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

    const toggle = (on: boolean) => cn('inline-flex min-h-11 items-center gap-2 border-b px-0.5 text-xs font-medium uppercase tracking-[0.24em] transition-colors',
        on ? 'border-[var(--site-accent-text)] text-[var(--site-text)]' : 'border-transparent text-[var(--site-muted)] hover:text-[var(--site-text)]');
    const lead = c.tagline || edit?.showEmpty
        ? <EditableText as="p" field="tagline" value={c.tagline} placeholder="Alt başlık yazın" className={heroLead} />
        : null;

    return (
        // Başlık kapağın üstünde saydam durur ve sayfayla kayar; üstte yapışık kalan yalnız kategori şeridi.
        <SitePage site={site} current="menu" overlayHeader stickyHeader={false} mobileActions={mobileActions}>
            <main className="flex flex-1 flex-col bg-[var(--site-bg)] text-[var(--site-text)]">
                <EliteHero titleId="mn-baslik" label="Menü" title={<>Sofranın <em className="italic">tamamı</em></>} lead={lead}
                    image={c.menuHeroUrl || c.coverImageUrl} ownImage={Boolean(c.menuHeroUrl)}
                    imageTarget="photo:hero-menu" imageLabel="Menü kapağı" emptyHint="+ Menü kapağı seç" />

                <ExternalHint source="menu">
                    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-10 sm:px-10 md:pb-[140px]">
                        {!menuEmpty && (
                            <div className="flex flex-col items-center gap-4">
                                <label className="mt-6 flex h-[54px] w-full max-w-[460px] items-center gap-3.5 border-b border-[color-mix(in_srgb,var(--site-text)_30%,transparent)] focus-within:border-[var(--site-text)]">
                                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--site-muted)" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                                    <span className="sr-only">Menüde ara</span>
                                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Menüde arayın"
                                        className={cn(elItalic, 'min-w-0 flex-1 border-0 bg-transparent text-[22px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-muted)]')} />
                                </label>
                                {(hasFeatured || hasFast) && (
                                    <div className="flex flex-wrap justify-center gap-x-7">
                                        {hasFeatured && <button type="button" aria-pressed={onlyFeatured} onClick={() => setOnlyFeatured(v => !v)} className={toggle(onlyFeatured)}>Ustanın seçimi</button>}
                                        {hasFast && <button type="button" aria-pressed={onlyFast} onClick={() => setOnlyFast(v => !v)} className={toggle(onlyFast)}>{FAST_MINUTES} dk ve altı</button>}
                                    </div>
                                )}
                            </div>
                        )}

                        {menuEmpty ? (
                            <p className={cn(elItalic, 'm-0 pt-20 text-center text-[30px]')}>Menü henüz hazırlanıyor.</p>
                        ) : (
                            <div className="rb-el-flow pt-6">
                                <EliteFlowStyle design="elit" />
                                <DeliveryMenu
                                    categories={categories}
                                    setMenus={setMenus}
                                    restaurant={restaurantName(site)}
                                    productQuantity={productQty}
                                    setMenuQuantity={setMenuQty}
                                    onAddProduct={p => cart.addProduct(p.id)}
                                    onRemoveProduct={p => cart.removeProduct(p.id)}
                                    onOpenSetMenu={setSetMenuOpen}
                                    onRemoveSetMenu={m => cart.removeSetMenu(m.id)}
                                    readOnly={!canOrder || !!edit}
                                    canAddProduct={p => { const d = cart.productFor(p.id); return !!d && !d.isOutOfStock; }}
                                    canAddSetMenu={m => !!cart.setMenuFor(m.id)?.menu.isAvailable}
                                    empty={nothingFound && (
                                        <div className="flex flex-col items-center gap-3 pt-14 text-center" aria-live="polite">
                                            <p className={cn(elItalic, 'm-0 text-[30px] leading-tight')}>{query.trim() ? `“${query.trim()}” menümüzde yok.` : 'Sonuç yok.'}</p>
                                            <p className="m-0 text-sm text-[var(--site-sub)]">Farklı bir kelime deneyin ya da süzgeçleri kaldırın.</p>
                                        </div>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                </ExternalHint>

                {showCartBar && (
                    <div className="pointer-events-none sticky bottom-4 z-[5] flex justify-center px-4 pb-4 md:bottom-6">
                        <Link to="/siparis" aria-label={`Sepete git: ${cart.count} ürün, ${formatSitePrice(cart.subtotal)}`}
                            className="pointer-events-auto flex h-16 max-w-full items-center gap-4 bg-[var(--site-paper)] py-2 pl-5 pr-2 text-[var(--site-on-paper)] no-underline shadow-[0_18px_40px_rgba(43,33,25,0.35)] sm:gap-[22px] sm:pl-[30px]">
                            <span className={cn(elLabel, 'whitespace-nowrap tracking-[0.22em]')}>{cart.count} ürün</span>
                            <span aria-hidden="true" className="h-[22px] w-px bg-[color-mix(in_srgb,var(--site-on-paper)_25%,transparent)]" />
                            <span className={cn(elSerif, 'whitespace-nowrap text-[22px] tabular-nums sm:text-2xl')}>{formatSitePrice(cart.subtotal)}</span>
                            <span className="inline-flex h-12 items-center whitespace-nowrap bg-[var(--site-pop)] px-5 text-xs font-medium uppercase tracking-[0.26em] text-[var(--site-on-pop)] sm:px-6">Sepete git</span>
                        </Link>
                    </div>
                )}
            </main>

            {sheetMenu && (
                <div className="rb-el-flow">
                    <DeliverySetMenuSheet
                        menu={sheetMenu}
                        restaurant={restaurantName(site)}
                        onClose={() => setSetMenuOpen(null)}
                        onAdd={(selections, quantity, note) => { cart.addSetMenuWith(sheetMenu.id, selections, quantity, note); setSetMenuOpen(null); }}
                    />
                </div>
            )}
        </SitePage>
    );
}
