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
import { EditableBlock, EditableText, ExternalHint } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import type { DesignPageProps } from '../registry';
import { DrawnPlate, MorningChip, Sprig, WeekendCard } from './BahceBits';
import { bhDisplay, bhWrap } from './bahceParts';

// Bahçe Kahvaltısı menü sayfası: üstte yuvarlak kapak panosu (kapak renginde): kalın "Menü", alt başlık, bugünün saati,
// yuvarlak arama kutusu ve çip süzgeçler; yanında menü kapağı büyük tabakta (yoksa çizimli tabaklar). Altında sayfa
// genişliğinde KARELİ MASA ÖRTÜSÜ, üstünde beyaz bir kâğıt: ortak menü (DeliveryMenu, variant "bahce"): yuvarlak çip
// kategori şeridi, tabak simgeli bölüm başlıkları, iki sütun yuvarlak tabaklı ürün kartları; −/+ adet ve hazır menü
// penceresi paket siparişle aynı. Sepette ürün varken altta yuvarlak yapışkan sepet çubuğu; en altta hafta sonu kartı.

export default function BahceMenu({ site }: DesignPageProps) {
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
    const heroImage = site.site.menuHeroUrl;

    // Telefonun alt çubuğu: sepet doluyken yerini sepet çubuğu alır; yoksa Ara · (Masa ayırt | Paket sipariş).
    const mobileActions: MobileAction[] = [];
    if (!showCartBar) {
        if (site.phone) mobileActions.push({ key: 'ara', label: 'Ara', icon: <PhoneIcon className="h-[18px] w-[18px]" />, href: telHref(site.phone) });
        if (canReserve) mobileActions.push({ key: 'rez', label: 'Masa ayırt', icon: <CalendarIcon className="h-[18px] w-[18px]" />, to: RESERVATION_PATH, primary: true });
        else if (canOrder) mobileActions.push({ key: 'paket', label: 'Paket sipariş', icon: <BagIcon className="h-[18px] w-[18px]" />, to: '/siparis', primary: true });
    }

    const filter = (on: boolean) => cn('inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] font-bold transition-colors',
        on ? 'bg-[var(--site-mustard)] text-[var(--site-text)]' : 'bg-[color-mix(in_srgb,var(--site-on-cover)_14%,transparent)] text-[var(--site-on-cover)] hover:bg-[color-mix(in_srgb,var(--site-on-cover)_22%,transparent)]');

    return (
        <SitePage site={site} current="menu" stickyHeader={false} mobileActions={mobileActions}>
            <main className="flex flex-1 flex-col">
                <section aria-labelledby="bh-menu" className="px-2.5 pb-8 pt-4 sm:px-5 sm:pt-6">
                    <div className="relative mx-auto grid max-w-[1200px] items-center gap-6 overflow-hidden rounded-[40px] bg-[var(--site-hero-bg)] px-5 py-10 text-[var(--site-on-cover)] sm:px-10 sm:py-14 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                        <span aria-hidden="true" className="rb-bh-table pointer-events-none absolute -right-[18%] -top-[30%] h-[140%] w-[70%] rounded-full opacity-70 max-md:hidden" />
                        <div className="relative flex min-w-0 flex-col items-start gap-5">
                            <h1 id="bh-menu" className={cn(bhDisplay, 'text-[84px] sm:text-[120px] md:text-[136px]')}>Menü</h1>
                            {(site.site.tagline || edit?.showEmpty) && (
                                <EditableText as="p" field="tagline" value={site.site.tagline} placeholder="Alt başlık yazın"
                                    className="m-0 max-w-[36ch] text-[18px] leading-snug sm:text-[21px]" />
                            )}
                            <MorningChip site={site} tone="cover" weekend />
                            {!edit && !menuEmpty && (
                                <div className="mt-2 flex w-full flex-col gap-3">
                                    <label className="flex h-14 w-full max-w-[480px] items-center gap-3 rounded-full bg-[var(--site-card)] px-5 text-[var(--site-text)] shadow-[inset_0_0_0_2px_transparent] transition-shadow focus-within:shadow-[inset_0_0_0_2px_var(--site-mustard)]">
                                        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--site-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                                        <span className="sr-only">Menüde ara</span>
                                        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Bu sabah ne yesek?"
                                            className="min-w-0 flex-1 border-0 bg-transparent text-[17px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-muted)]" />
                                    </label>
                                    {(hasFeatured || hasFast) && (
                                        <div className="flex flex-wrap gap-2">
                                            {hasFeatured && <button type="button" aria-pressed={onlyFeatured} onClick={() => setOnlyFeatured(v => !v)} className={filter(onlyFeatured)}>Mutfağın önerileri</button>}
                                            {hasFast && <button type="button" aria-pressed={onlyFast} onClick={() => setOnlyFast(v => !v)} className={filter(onlyFast)}>{FAST_MINUTES} dakikada gelenler</button>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="relative mx-auto w-full max-w-[300px] md:max-w-[360px]">
                            <EditableBlock target="photo:hero-menu" label="Menü kapağı" chip="Fotoğrafı değiştir" className="rounded-full">
                                {heroImage ? (
                                    <span className="rb-bh-plate block aspect-square overflow-hidden rounded-full p-[5%]">
                                        <img src={heroImage} alt="" className="block h-full w-full rounded-full object-cover" />
                                    </span>
                                ) : (
                                    <span className="grid grid-cols-2 gap-3 p-2">
                                        {(['egg', 'tomato', 'cheese', 'tea'] as const).map(k => <DrawnPlate key={k} kind={k} />)}
                                        {edit && <span className="col-span-2 text-center font-[family-name:'DM_Sans',system-ui,sans-serif] text-[14px] font-semibold">+ Menü kapağı seç</span>}
                                    </span>
                                )}
                            </EditableBlock>
                            <Sprig className="absolute -bottom-3 -left-6 w-[120px] -rotate-[12deg]" />
                        </div>
                    </div>
                </section>

                <ExternalHint source="menu">
                    <div className="rb-bh-cloth px-2.5 py-8 sm:px-5 sm:py-14">
                        {/* Örtünün üstünde beyaz kâğıt. */}
                        <div className={cn(bhWrap, 'rounded-[36px] bg-[var(--site-card)] pb-8 pt-2 shadow-[0_30px_60px_-40px_color-mix(in_srgb,var(--site-text)_55%,transparent)] sm:px-10 sm:pb-12 md:pt-4')}>
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
                                    variant="bahce"
                                    canAddProduct={p => { const d = cart.productFor(p.id); return !!d && !d.isOutOfStock; }}
                                    canAddSetMenu={m => !!cart.setMenuFor(m.id)?.menu.isAvailable}
                                    empty={nothingFound && (
                                        <div className="flex flex-col items-center gap-3 py-14 text-center">
                                            <DrawnPlate kind="tea" className="w-16" />
                                            <span className={cn(serif, 'text-[28px] leading-tight tracking-[-0.02em]')}>{query.trim() ? `“${query.trim()}” için sonuç yok` : 'Sonuç yok'}</span>
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
                            className="pointer-events-auto flex h-16 max-w-full items-center gap-3 rounded-full border border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-card)_94%,transparent)] py-2 pl-2 pr-2 text-[var(--site-text)] no-underline shadow-[0_18px_44px_-16px_color-mix(in_srgb,var(--site-text)_50%,transparent)] backdrop-blur-[10px] sm:gap-5">
                            <span className="inline-flex h-12 min-w-12 items-center justify-center rounded-full bg-[var(--site-mustard)] px-3 text-[15px] font-extrabold tabular-nums text-[var(--site-text)]">{cart.count}</span>
                            <span className="hidden whitespace-nowrap font-bold sm:inline">ürün sepette</span>
                            <span className={cn(serif, 'whitespace-nowrap text-[22px] tabular-nums tracking-[-0.02em]')}>{formatSitePrice(cart.subtotal)}</span>
                            <span className="inline-flex h-12 items-center whitespace-nowrap rounded-full bg-[var(--site-accent)] px-5 font-bold text-[var(--site-on-accent)]">Sepete git</span>
                        </Link>
                    </div>
                )}

                <div className="pt-12 sm:pt-16"><WeekendCard site={site} /></div>
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
