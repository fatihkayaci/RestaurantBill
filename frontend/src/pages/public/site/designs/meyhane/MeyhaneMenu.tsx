import { useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import DeliveryMenu from '../../../delivery/DeliveryMenu';
import DeliverySetMenuSheet from '../../../delivery/DeliverySetMenuSheet';
import { SitePage } from '../../SiteFrame';
import type { MobileAction } from '../../siteActions';
import { BagIcon, CalendarIcon, PhoneIcon } from '../../SiteCards';
import { RESERVATION_PATH, serif } from '../../siteParts';
import { FAST_MINUTES, useMenuView } from '../../useMenuView';
import { formatSitePrice, telHref } from '../../siteTheme';
import { restaurantName } from '../../useSite';
import { EditableText, ExternalHint } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { LampString, NightBackdrop, ReserveBand, TonightStrip } from './MeyhaneBits';
import { mhSign, mhUnderHeader, mhWrap } from './meyhaneParts';

// Meyhane Gecesi menü sayfası: gece kapağında tabela gibi "Menü", alt başlık, bu akşamın saati, alt çizgili arama ve
// yazı süzgeçleri; altında basılı meyhane menü kartı (geniş ekranda çift çizgi çerçeve): ortak menü (DeliveryMenu,
// variant "meyhane"): yazı sekmeli kategori şeridi, ortalı bölüm başlıkları, mezeler tepside, öteki bölümler noktalı
// fiyat satırları; −/+ adet ve hazır menü penceresi paket siparişle aynı. Sepette ürün varken altta yapışkan sepet
// çubuğu; en altta "Masa ayırt" bandı.

export default function MeyhaneMenu({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    const [setMenuOpen, setSetMenuOpen] = useState<OnlineSetMenu | null>(null);
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const { query, setQuery, onlyFeatured, setOnlyFeatured, onlyFast, setOnlyFast, products, groups, setMenus } = useMenuView(site);

    const name = restaurantName(site);
    const canReserve = canReserveOnline(site);
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

    // Telefonun alt çubuğu: sepet doluyken yerini sepet çubuğu alır; yoksa Ara · (Masa ayırt | Paket sipariş).
    const mobileActions: MobileAction[] = [];
    if (!showCartBar) {
        if (site.phone) mobileActions.push({ key: 'ara', label: 'Ara', icon: <PhoneIcon className="h-[18px] w-[18px]" />, href: telHref(site.phone) });
        if (canReserve) mobileActions.push({ key: 'rez', label: 'Masa ayırt', icon: <CalendarIcon className="h-[18px] w-[18px]" />, to: RESERVATION_PATH, primary: true });
        else if (canOrder) mobileActions.push({ key: 'paket', label: 'Paket sipariş', icon: <BagIcon className="h-[18px] w-[18px]" />, to: '/siparis', primary: true });
    }

    const filter = (on: boolean) => cn('inline-flex min-h-11 items-center gap-2 border-b-2 px-1 text-[15px] font-semibold transition-colors',
        on ? 'border-[var(--site-accent-text)] text-[var(--site-text)]' : 'border-transparent text-[var(--site-sub)] hover:text-[var(--site-text)]');

    return (
        <SitePage site={site} current="menu" stickyHeader={false} mobileActions={mobileActions}>
            <main className="flex flex-1 flex-col">
                <section aria-labelledby="mh-menu" className={cn('relative isolate overflow-hidden', !edit && mhUnderHeader)}>
                    <NightBackdrop image={site.site.menuHeroUrl || undefined} target="photo:hero-menu" label="Menü kapağı" emptyHint="+ Menü kapağı seç" />
                    <LampString className="top-[76px] lg:top-[92px]" sag={30} />
                    <div className="pointer-events-none relative z-[1] [&_[data-edit-target]]:pointer-events-auto mx-auto flex max-w-[760px] flex-col items-center gap-5 px-4 pb-12 pt-[150px] text-center sm:px-8 lg:pt-[176px] [&_[data-edit-text]]:pointer-events-auto [&_input]:pointer-events-auto [&_button]:pointer-events-auto">
                        <h1 id="mh-menu" className={cn(mhSign, 'text-[88px] sm:text-[120px] md:text-[148px]')}>Menü</h1>
                        {(site.site.tagline || edit?.showEmpty) && (
                            <EditableText as="p" field="tagline" value={site.site.tagline} placeholder="Alt başlık yazın"
                                className={cn(serif, 'm-0 max-w-[32ch] text-[20px] leading-snug sm:text-[24px]')} />
                        )}
                        <TonightStrip site={site} />
                        {!edit && !menuEmpty && (
                            <div className="mt-4 flex w-full flex-col items-center gap-3">
                                <label className="flex h-14 w-full max-w-[460px] items-center gap-3 border-b-2 border-[var(--site-border-strong)] px-1 text-[var(--site-text)] transition-colors focus-within:border-[var(--site-accent-text)]">
                                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--site-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                                    <span className="sr-only">Menüde ara</span>
                                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Bu akşam ne yesek?"
                                        className="min-w-0 flex-1 border-0 bg-transparent text-[17px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-muted)]" />
                                </label>
                                {(hasFeatured || hasFast) && (
                                    <div className="flex flex-wrap justify-center gap-x-6">
                                        {hasFeatured && <button type="button" aria-pressed={onlyFeatured} onClick={() => setOnlyFeatured(v => !v)} className={filter(onlyFeatured)}>Ustanın seçimi</button>}
                                        {hasFast && <button type="button" aria-pressed={onlyFast} onClick={() => setOnlyFast(v => !v)} className={filter(onlyFast)}>{FAST_MINUTES} dakikada gelenler</button>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <ExternalHint source="menu">
                    <div className={cn(mhWrap, 'pb-16 pt-4 sm:pb-24')}>
                        {/* Basılı menü kartı: geniş ekranda çift çizgi çerçeve. */}
                        <div className="md:border md:border-[var(--site-border-mid)] md:px-10 md:pb-10 md:outline md:outline-1 md:outline-offset-[6px] md:outline-[var(--site-border)] lg:px-14">
                            {menuEmpty ? (
                                <p className="m-0 py-14 text-center text-lg text-[var(--site-sub)]">Menü henüz hazırlanıyor.</p>
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
                                    variant="meyhane"
                                    canAddProduct={p => { const d = cart.productFor(p.id); return !!d && !d.isOutOfStock; }}
                                    canAddSetMenu={m => !!cart.setMenuFor(m.id)?.menu.isAvailable}
                                    empty={nothingFound && (
                                        <div className="flex flex-col items-center gap-2 py-14 text-center">
                                            <span className={cn(serif, 'text-[32px] leading-tight')}>{query.trim() ? `“${query.trim()}” için sonuç yok` : 'Sonuç yok'}</span>
                                            <span className="text-[var(--site-sub)]">Başka bir kelime deneyin ya da süzgeçleri kaldırın.</span>
                                        </div>
                                    )}
                                />
                            )}
                        </div>
                    </div>
                </ExternalHint>

                {showCartBar && (
                    <div className="pointer-events-none sticky bottom-4 z-[5] flex justify-center px-3">
                        <Link to="/siparis" aria-label={`Sepete git: ${cart.count} ürün, ${formatSitePrice(cart.subtotal)}`}
                            className="pointer-events-auto flex h-16 max-w-full items-center gap-3 rounded-md border border-[var(--site-border-mid)] bg-[color-mix(in_srgb,var(--site-card)_94%,transparent)] py-2 pl-5 pr-2 text-[var(--site-text)] no-underline shadow-[0_18px_44px_-16px_rgba(0,0,0,0.85)] backdrop-blur-[10px] sm:gap-5">
                            <span className="inline-flex items-center gap-2 whitespace-nowrap font-bold">
                                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--site-accent)] px-2 text-[13px] font-extrabold tabular-nums text-[var(--site-on-accent)]">{cart.count}</span>
                                <span className="hidden sm:inline">ürün sepette</span>
                            </span>
                            <span className={cn(serif, 'whitespace-nowrap text-[22px] tabular-nums')}>{formatSitePrice(cart.subtotal)}</span>
                            <span className="inline-flex h-12 items-center whitespace-nowrap rounded-md bg-[var(--site-accent)] px-5 font-bold text-[var(--site-on-accent)]">Sepete git</span>
                        </Link>
                    </div>
                )}

                <ReserveBand site={site} />
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
