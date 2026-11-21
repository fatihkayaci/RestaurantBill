import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import DeliveryMenu from '../../../delivery/DeliveryMenu';
import DeliverySetMenuSheet from '../../../delivery/DeliverySetMenuSheet';
import { SitePage } from '../../SiteFrame';
import { serif } from '../../siteParts';
import { FAST_MINUTES, useMenuView } from '../../useMenuView';
import { formatSitePrice } from '../../siteTheme';
import { restaurantName } from '../../useSite';
import { EditableText, ExternalHint } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { CallBand, OpenLine, TileStrip } from './EsnafBits';
import { useEsnafMobileActions } from './esnafActions';
import { esSign, esWrap } from './esnafParts';

// Esnaf Tabelası menü sayfası: duvardaki FİYAT LİSTESİ.
// Üstte tabela renginde plaka: dev "Fiyat listesi", alt başlık, bugünün saati; altında çini şerit ve krem zeminde kalın
// çerçeveli arama kutusu ile köşeli süzgeç düğmeleri. Altında ortak menü (DeliveryMenu, variant "esnaf"): tabela plakası
// sekmeli kategori şeridi, her kategori çini kenarlı ayrı bir pano (büyük harf ad, sağa dayalı büyük fiyat), panolar
// genişledikçe iki-üç sütun duvar gibi; −/+ adet ve hazır menü penceresi paket siparişle aynı. Sepette ürün varken
// altta yapışkan sarı sepet fişi; en altta "Buyurun" bandı.

export default function EsnafMenu({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    const [setMenuOpen, setSetMenuOpen] = useState<OnlineSetMenu | null>(null);
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const { query, setQuery, onlyFeatured, setOnlyFeatured, onlyFast, setOnlyFast, products, groups, setMenus } = useMenuView(site);
    const defaultActions = useEsnafMobileActions(site, 'menu');

    const name = restaurantName(site);
    const hasFeatured = products.some(p => p.isFeatured) || (site.setMenus ?? []).some(m => m.isFeatured);
    const hasFast = products.some(p => !!p.prepMinutes && p.prepMinutes <= FAST_MINUTES);
    const nothingFound = groups.length === 0 && setMenus.length === 0;
    const menuEmpty = site.categories.length === 0 && (site.setMenus ?? []).length === 0;
    const readOnly = !canOrder || !!edit;
    const categories = groups.map(g => ({ ...g.category, products: g.items }));
    const productQty = (id: string) => cart.lines.filter(l => l.kind === 'product' && l.productId === id).reduce((s, l) => s + l.quantity, 0);
    const setMenuQty = (id: string) => cart.lines.filter(l => l.kind === 'setMenu' && l.setMenuId === id).reduce((s, l) => s + l.quantity, 0);
    const sheetMenu = setMenuOpen ? cart.setMenuFor(setMenuOpen.id)?.menu : undefined;
    const showCartBar = canOrder && cart.count > 0 && !edit;
    // Sepet doluyken alt çubuğun yerini sepet fişi alır.
    const mobileActions = showCartBar ? [] : defaultActions;

    const filter = (on: boolean) => cn('inline-flex min-h-11 items-center gap-2 rounded-md border-[3px] px-4 text-sm font-extrabold uppercase tracking-[0.04em] transition-colors',
        on ? 'border-[var(--site-text)] bg-[var(--site-text)] text-[var(--site-bg)]' : 'border-[var(--site-text)] bg-[var(--site-card)] text-[var(--site-text)] hover:bg-[var(--site-alt)]');

    return (
        <SitePage site={site} current="menu" stickyHeader={false} mobileActions={mobileActions}>
            <main className="flex flex-1 flex-col">
                <section aria-labelledby="es-menu" className="rb-es-sign bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]">
                    <div className={cn(esWrap, 'flex flex-col gap-5 pb-10 pt-10 sm:pb-12 sm:pt-14 lg:flex-row lg:items-end lg:justify-between lg:gap-12')}>
                        <div className="flex min-w-0 flex-col gap-4">
                            <h1 id="es-menu" className={cn(esSign, 'text-[72px] sm:text-[112px] lg:text-[148px]')}>Fiyat listesi</h1>
                            {(site.site.tagline || edit?.showEmpty) && (
                                <EditableText as="p" field="tagline" value={site.site.tagline} placeholder="Alt başlık yazın"
                                    className="m-0 max-w-[44ch] text-[18px] font-semibold leading-snug sm:text-[20px]" />
                            )}
                        </div>
                        <OpenLine site={site} className="shrink-0 text-[15px]" dotClassName="ring-2 ring-[var(--site-on-cover)]" />
                    </div>
                    <TileStrip />
                </section>

                {!edit && !menuEmpty && (
                    <div className={cn(esWrap, 'flex flex-col gap-3 pt-8 sm:flex-row sm:items-center')}>
                        <label className="flex h-14 w-full min-w-0 items-center gap-3 rounded-md border-[3px] border-[var(--site-text)] bg-[var(--site-card)] px-4 text-[var(--site-text)] focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--site-focus)] sm:max-w-[460px]">
                            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                            <span className="sr-only">Menüde ara</span>
                            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ne arıyorsunuz? Lahmacun, ayran…"
                                className="min-w-0 flex-1 border-0 bg-transparent text-[17px] font-semibold text-[var(--site-text)] outline-none placeholder:font-normal placeholder:text-[var(--site-muted)]" />
                        </label>
                        {(hasFeatured || hasFast) && (
                            <div className="flex flex-wrap gap-2">
                                {hasFeatured && <button type="button" aria-pressed={onlyFeatured} onClick={() => setOnlyFeatured(v => !v)} className={filter(onlyFeatured)}>Ustanın seçimi</button>}
                                {hasFast && <button type="button" aria-pressed={onlyFast} onClick={() => setOnlyFast(v => !v)} className={filter(onlyFast)}>{FAST_MINUTES} dakikada hazır</button>}
                            </div>
                        )}
                    </div>
                )}

                <ExternalHint source="menu">
                    <div className={cn(esWrap, 'pb-14 pt-2 sm:pb-20')}>
                        {menuEmpty ? (
                            <p className={cn(serif, 'm-0 py-16 text-center text-[40px] leading-none')}>Fiyat listesi hazırlanıyor</p>
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
                                variant="esnaf"
                                canAddProduct={p => { const d = cart.productFor(p.id); return !!d && !d.isOutOfStock; }}
                                canAddSetMenu={m => !!cart.setMenuFor(m.id)?.menu.isAvailable}
                                empty={nothingFound && (
                                    <div className="flex flex-col items-start gap-2 py-14">
                                        <span className={cn(serif, 'text-[40px] leading-[0.95]')}>{query.trim() ? `“${query.trim()}” bulunamadı` : 'Sonuç yok'}</span>
                                        <span className="text-[var(--site-sub)]">Başka bir kelime deneyin ya da süzgeçleri kaldırın.</span>
                                    </div>
                                )}
                            />
                        )}
                    </div>
                </ExternalHint>

                {showCartBar && (
                    <div className="pointer-events-none sticky bottom-3 z-[5] flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
                        <Link to="/siparis" aria-label={`Sepete git: ${cart.count} ürün, ${formatSitePrice(cart.subtotal)}`}
                            className="pointer-events-auto flex h-16 w-full max-w-[520px] items-center gap-3 rounded-md border-[3px] border-[var(--site-text)] bg-[var(--site-pop)] py-2 pl-4 pr-2 text-[var(--site-on-pop)] no-underline shadow-[0_6px_0_var(--site-text)] sm:gap-5">
                            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-[4px] bg-[var(--site-on-pop)] px-2 text-sm font-extrabold tabular-nums text-[var(--site-pop)]">{cart.count}</span>
                            <span className={cn(serif, 'min-w-0 flex-1 whitespace-nowrap text-[26px] leading-none tabular-nums')}>{formatSitePrice(cart.subtotal)}</span>
                            <span className="inline-flex h-11 items-center whitespace-nowrap rounded-[4px] bg-[var(--site-on-pop)] px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-[var(--site-pop)]">Sepete git</span>
                        </Link>
                    </div>
                )}

                <CallBand site={site} />
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
