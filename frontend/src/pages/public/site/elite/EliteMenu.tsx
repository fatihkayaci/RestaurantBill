import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline, type PublicProduct, type PublicSite } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { useSiteCart, type SiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { SitePage } from '../SiteFrame';
import type { MobileAction } from '../siteActions';
import { BagIcon, CalendarIcon, DirectionsIcon, PhoneIcon } from '../SiteCards';
import { SlotsSummary } from '../SiteSetMenus';
import { savingLabel } from '../setMenuParts';
import { RESERVATION_PATH } from '../siteParts';
import { directionsUrl, formatSitePrice, telHref } from '../siteTheme';
import { fullAddress } from '../useSite';
import { EditableText, ExternalHint } from '../siteEdit';
import { useSiteEdit } from '../siteEditContext';
import { FAST_MINUTES, SET_MENUS_ID, useMenuView } from '../useMenuView';
import { EliteAddButton, EliteDishLine, EliteHero, EliteRoundButton } from './EliteBits';
import { elButton, elItalic, elLabel, elSerif, heroLead, roman } from './eliteParts';

// /menu, Elit (tasarım: EliteMenu). Tam genişlik kapak (Menü kapağı, yoksa sitenin kapağı; o da yoksa desenli koyu
// bant), krem sayfada yapışkan kategori şeridi (görünen bölüm altın alt çizgili), ince çizgili arama ve verisi varsa
// "Ustanın seçimi" / "10 dk ve altı" süzgeçleri; bölümler roma rakamı, serif başlık ve "Ad ······ fiyat" satırları.
// Online sipariş açıkken yuvarlak + düğmeleri ve sepette ürün varken altta koyu sepet çubuğu. Sıra admin'deki sıradır.

export default function EliteMenu({ site }: { site: PublicSite }) {
    const edit = useSiteEdit();
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const [announce, setAnnounce] = useState('');
    const {
        query, setQuery, onlyFeatured, setOnlyFeatured, onlyFast, setOnlyFast, products, groups, setMenus, nav, active, strip,
    } = useMenuView(site);

    const c = site.site;
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

    const toggle = (on: boolean) => cn('inline-flex min-h-11 items-center gap-2 border-b px-0.5 text-[11px] font-medium uppercase tracking-[0.24em] transition-colors',
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
                    {nav.length > 1 && (
                        <nav aria-label="Kategoriler" className="sticky top-0 z-[4] border-b border-[color-mix(in_srgb,var(--site-text)_12%,transparent)] bg-[var(--site-bg)]">
                            <div ref={strip} className="overflow-x-auto px-4 [scrollbar-width:none] sm:px-10">
                                <div className="mx-auto flex w-max gap-7 md:gap-10">
                                    {nav.map(n => {
                                        const on = active === n.id;
                                        return (
                                            <a key={n.id} href={`#${n.id}`} data-nav={n.id} aria-current={on ? 'location' : undefined}
                                                className={cn('inline-flex min-h-[60px] shrink-0 items-center whitespace-nowrap border-b-2 pt-0.5 text-[11px] font-medium uppercase tracking-[0.26em] no-underline transition-colors',
                                                    on ? 'border-[var(--site-accent-text)] text-[var(--site-text)]' : 'border-transparent text-[var(--site-muted)] hover:text-[var(--site-text)]')}>
                                                {n.label}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        </nav>
                    )}

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
                        ) : nothingFound && (
                            <div className="flex flex-col items-center gap-3 pt-20 text-center" aria-live="polite">
                                <p className={cn(elItalic, 'm-0 text-[30px] leading-tight')}>{query.trim() ? `“${query.trim()}” menümüzde yok.` : 'Sonuç yok.'}</p>
                                <p className="m-0 text-sm text-[var(--site-sub)]">Farklı bir kelime deneyin ya da süzgeçleri kaldırın.</p>
                            </div>
                        )}

                        {setMenus.length > 0 && (
                            <ExternalHint source="setMenus">
                                <section id={SET_MENUS_ID} aria-labelledby="mn-hazir" className="flex scroll-mt-16 flex-col gap-10 pt-20 md:pt-24">
                                    <SectionHead id="mn-hazir" num={roman(1)} title="Hazır menüler" note={`${setMenus.length} menü`} />
                                    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-8 p-0">
                                        {setMenus.map(menu => <li key={menu.id} className="min-w-0"><SetMenuLine menu={menu} cart={cart} /></li>)}
                                    </ul>
                                </section>
                            </ExternalHint>
                        )}

                        {groups.map((g, i) => (
                            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-baslik`} className="flex scroll-mt-16 flex-col gap-10 pt-20 md:pt-24">
                                <SectionHead id={`${g.id}-baslik`} num={roman(i + 1 + (setMenus.length > 0 ? 1 : 0))} title={g.category.name} note={`${g.items.length} ürün`} />
                                <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-[30px] p-0">
                                    {g.items.map(p => <li key={p.id} className="min-w-0"><ProductLine product={p} cart={cart} onAdded={onAdded} /></li>)}
                                </ul>
                            </section>
                        ))}
                        <p className="sr-only" aria-live="polite">{announce}</p>
                    </div>
                </ExternalHint>

                {showCartBar && (
                    <div className="pointer-events-none sticky bottom-4 z-[5] flex justify-center px-4 pb-4 md:bottom-6">
                        <Link to="/siparis" aria-label={`Sepete git: ${cart.count} ürün, ${formatSitePrice(cart.subtotal)}`}
                            className="pointer-events-auto flex h-16 max-w-full items-center gap-4 bg-[var(--site-paper)] py-2 pl-5 pr-2 text-[var(--site-on-paper)] no-underline shadow-[0_18px_40px_rgba(43,33,25,0.35)] sm:gap-[22px] sm:pl-[30px]">
                            <span className={cn(elLabel, 'whitespace-nowrap tracking-[0.22em]')}>{cart.count} ürün</span>
                            <span aria-hidden="true" className="h-[22px] w-px bg-[color-mix(in_srgb,var(--site-on-paper)_25%,transparent)]" />
                            <span className={cn(elSerif, 'whitespace-nowrap text-[22px] tabular-nums sm:text-2xl')}>{formatSitePrice(cart.subtotal)}</span>
                            <span className="inline-flex h-12 items-center whitespace-nowrap bg-[var(--site-pop)] px-5 text-[11px] font-medium uppercase tracking-[0.26em] text-[var(--site-on-pop)] sm:px-6">Sepete git</span>
                        </Link>
                    </div>
                )}
            </main>
        </SitePage>
    );
}

/** Bölüm başlığı: italik roma rakamı, serif ad, altında iki yanı ince çizgili kısa not (ürün sayısı). */
function SectionHead({ id, num, title, note }: { id: string; num: string; title: string; note: string }) {
    return (
        <div className="flex flex-col items-center gap-3 text-center">
            <span aria-hidden="true" className={cn(elItalic, 'text-xl text-[var(--site-accent-text)]')}>{num}</span>
            <h2 id={id} className={cn(elSerif, 'm-0 max-w-full break-words text-[40px] leading-none md:text-[52px]')}>{title}</h2>
            <span className={cn('flex items-center gap-3.5 text-xs uppercase tracking-[0.28em] text-[var(--site-muted)]')}>
                <span aria-hidden="true" className="h-px w-8 bg-[var(--site-accent)]" />{note}<span aria-hidden="true" className="h-px w-8 bg-[var(--site-accent)]" />
            </span>
        </div>
    );
}

function ProductLine({ product, cart, onAdded }: { product: PublicProduct; cart: SiteCart; onAdded: (name: string) => void }) {
    const meta = [product.description?.trim(), product.prepMinutes ? `~${product.prepMinutes} dk` : null].filter(Boolean).join(' · ');
    const tag = product.isOutOfStock ? 'şu an tükendi' : product.isFeatured ? 'ustanın seçimi' : null;
    return (
        <div className="flex min-w-0 items-center gap-4">
            {product.imageUrl && (
                <span className="relative shrink-0">
                    <img src={product.imageUrl} alt={product.name} title={product.isStockImage ? 'Temsili görsel' : undefined} loading="lazy"
                        className="block h-14 w-14 bg-[var(--site-placeholder)] object-cover md:h-16 md:w-16" />
                    {product.isStockImage && <span className="sr-only"> (temsili görsel)</span>}
                </span>
            )}
            <div className="min-w-0 flex-1">
                <EliteDishLine name={product.name} price={formatSitePrice(product.price)} meta={meta} tag={tag} out={product.isOutOfStock}
                    action={<EliteAddButton product={product} cart={cart} onAdded={onAdded} />} />
            </div>
        </div>
    );
}

function SetMenuLine({ menu, cart }: { menu: OnlineSetMenu; cart: SiteCart }) {
    const saving = savingLabel(menu);
    const found = cart.enabled ? cart.setMenuFor(menu.id) : undefined;
    const qty = cart.lines.filter(l => l.kind === 'setMenu' && l.setMenuId === menu.id).reduce((s, l) => s + l.quantity, 0);
    let action: ReactNode = null;
    if (!menu.isAvailable) action = <span className="shrink-0 text-[11px] uppercase tracking-[0.22em] text-[var(--site-muted)]">Tükendi</span>;
    else if (found?.menu.isAvailable) {
        action = found.needsChoice
            ? <Link to="/siparis" aria-label={`${menu.name}: seçerek sepete ekle`} className={cn(elButton.line, 'min-h-11 shrink-0 px-4 md:min-h-11')}>Seç</Link>
            : <EliteRoundButton qty={qty} label={qty > 0 ? `${menu.name} sepete bir tane daha ekle (sepette ${qty})` : `${menu.name} sepete ekle`} onClick={() => cart.addSetMenu(menu.id)} />;
    }
    const price = (
        <>
            {saving && <s className="mr-2 text-base font-normal text-[var(--site-muted)]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}
            {saving && <span className="sr-only">Menü fiyatı </span>}{formatSitePrice(menu.price)}
        </>
    );
    return (
        <div className="flex flex-col gap-2">
            <EliteDishLine name={menu.name} price={price} size="lg" action={action} />
            <div className="text-[13px] leading-relaxed tracking-[0.03em] text-[var(--site-muted)]">
                {saving && <span className={cn(elLabel, 'mr-2 text-[10px] tracking-[0.22em] text-[var(--site-accent-text)]')}>{saving}</span>}
                {menu.description && <span>{menu.description} · </span>}
                <SlotsSummary menu={menu} className="inline" />
            </div>
        </div>
    );
}
