import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageHero, SitePage } from './site/SiteFrame';
import type { MobileAction } from './site/siteActions';
import { BagIcon, CalendarIcon, DirectionsIcon, PhoneIcon } from './site/SiteCards';
import { ClassicMenuList, FeaturedTile, MenuProductCard } from './site/SiteProductCards';
import { pickFeatured } from './site/siteMedia';
import { SetMenuRowCard } from './site/SiteSetMenus';
import { productPhotos } from './site/setMenuParts';
import { RESERVATION_PATH, cardButton, cardLink, productCount, serif, siteCardDark } from './site/siteParts';
import { directionsUrl, telHref } from './site/siteTheme';
import { fullAddress, hoursLine, restaurantName, useSite } from './site/useSite';
import { editTarget, useSiteEdit, useSiteWindow } from './site/siteEditContext';
import { ExternalHint } from './site/siteEdit';

// Restoran sitesinin menü sayfası (Öneri A + fotoğrafsız kategoride C'nin klasik liste stili).
// Kısa kapakta durum satırı ve cam arama kutusu; altında "Ustanın seçimi" şeridi (isFeatured; işaret yoksa fotoğraflı
// ilk ürünler); yapışkan kategori çubuğu; varsa "Hazır menüler"; kategoriler. Fotoğraflı ürün yatay kart, fotoğrafsız
// ürün metin kartı (noktalı fiyat çizgisi, hazırlık süresi rozeti); hiç fotoğrafı olmayan kategori tek kartta liste.
// Sayfanın sonunda koyu eylem kartı (Paket sipariş / Masa ayırt); telefonda alt eylem çubuğu. Sepet yok.

const SET_MENUS_ID = 'menuler';
const FEATURED_MAX = 8;

/** Kaydırırken görünen bölümün kimliği (çubuğun hemen altındaki bölüm). */
function useActiveSection(ids: string[]): string | null {
    const win = useSiteWindow();
    const [active, setActive] = useState<string | null>(null);
    const key = ids.join('|');
    useEffect(() => {
        const list = key ? key.split('|') : [];
        if (list.length === 0) return;
        let frame = 0;
        const update = () => {
            frame = 0;
            const line = 120; // yapışkan çubuğun altı
            let current: string | null = null;
            for (const id of list) {
                const el = win.document.getElementById(id);
                if (el && el.getBoundingClientRect().top - line <= 0) current = id;
            }
            setActive(current ?? list[0]);
        };
        const onScroll = () => { if (!frame) frame = win.requestAnimationFrame(update); };
        update();
        win.addEventListener('scroll', onScroll, { passive: true });
        win.addEventListener('resize', onScroll);
        return () => {
            win.removeEventListener('scroll', onScroll);
            win.removeEventListener('resize', onScroll);
            if (frame) win.cancelAnimationFrame(frame);
        };
    }, [key, win]);
    return active;
}

export default function RestaurantMenuPage() {
    const { site, error } = useSite();
    const [query, setQuery] = useState('');
    const canOrder = useOnlineOrderingAvailable();
    const chipBar = useRef<HTMLDivElement>(null);
    const hoursT = editTarget(useSiteEdit(), 'hours', 'Çalışma saatleri');

    const groups = useMemo(() => {
        if (!site) return [];
        const q = query.trim().toLocaleLowerCase('tr-TR');
        return site.categories
            .map(category => ({
                id: `kat-${category.id}`,
                category,
                items: q
                    ? category.products.filter(p => `${p.name} ${p.description} ${category.name}`.toLocaleLowerCase('tr-TR').includes(q))
                    : category.products,
            }))
            .filter(g => g.items.length > 0);
    }, [site, query]);

    // Hazır menüler de aramaya girer (ad, açıklama, içindeki ürünler).
    const setMenus = useMemo(() => {
        const menus = site?.setMenus ?? [];
        const q = query.trim().toLocaleLowerCase('tr-TR');
        if (!q) return menus;
        return menus.filter(m => [m.name, m.description, ...m.slots.flatMap(s => [s.name, ...s.options.map(o => o.productName)])]
            .join(' ').toLocaleLowerCase('tr-TR').includes(q));
    }, [site, query]);

    const chips = useMemo(() => [
        ...(setMenus.length > 0 ? [{ id: SET_MENUS_ID, name: 'Menüler', count: setMenus.length }] : []),
        ...groups.map(g => ({ id: g.id, name: g.category.name, count: g.items.length })),
    ], [groups, setMenus]);
    const active = useActiveSection(chips.map(c => c.id));

    // Görünen bölümün çipi çubukta görünür kalsın (yalnız çubuk yatay kayar, sayfa değil).
    useEffect(() => {
        const bar = chipBar.current;
        const chip = active ? bar?.querySelector<HTMLElement>(`[data-chip="${active}"]`) : null;
        if (!bar || !chip) return;
        const left = chip.offsetLeft - bar.offsetLeft;
        if (left < bar.scrollLeft || left + chip.offsetWidth > bar.scrollLeft + bar.clientWidth) {
            bar.scrollTo({ left: Math.max(0, left - 20), behavior: 'smooth' });
        }
    }, [active]);

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }

    const name = restaurantName(site);
    const totalItems = productCount(site);
    const status = site.isOpenNow === null ? null : site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı';
    const allProducts = site.categories.flatMap(c => c.products);
    const photoOf = productPhotos(allProducts);
    const nothingFound = groups.length === 0 && setMenus.length === 0;
    const canReserve = canReserveOnline(site);
    const address = fullAddress(site);

    // Öne çıkanlar: işaretli ürünler; hiç işaret yoksa fotoğraflı ilk dört ürün.
    const flagged = allProducts.filter(p => p.isFeatured);
    const featured = flagged.length > 0 ? pickFeatured(flagged, FEATURED_MAX) : pickFeatured(allProducts, 4, true);
    const showFeatured = !query.trim() && featured.length >= 2;

    // Telefonun alt çubuğu: Ara · (Paket sipariş | Masa ayırt | Yol tarifi).
    const mobileActions: MobileAction[] = [];
    if (site.phone) mobileActions.push({ key: 'ara', label: 'Ara', icon: <PhoneIcon className="h-[18px] w-[18px]" />, href: telHref(site.phone) });
    if (canOrder) mobileActions.push({ key: 'paket', label: 'Paket sipariş', icon: <BagIcon className="h-[18px] w-[18px]" />, to: '/siparis', primary: true });
    else if (canReserve) mobileActions.push({ key: 'rez', label: 'Masa ayırt', icon: <CalendarIcon className="h-[18px] w-[18px]" />, to: RESERVATION_PATH, primary: true });
    else if (address) mobileActions.push({ key: 'yol', label: 'Yol tarifi', icon: <DirectionsIcon className="h-[18px] w-[18px]" />, href: directionsUrl(address) });

    return (
        // Başlık sayfayla kayar (stickyHeader={false}); üstte sabit kalan yalnız kategori çubuğu.
        <SitePage site={site} current="menu" stickyHeader={false} lastCall={false} mobileActions={mobileActions}>
            <PageHero
                site={site}
                label={name}
                title="Menü"
                image={site.site.menuHeroUrl}
                imageTarget="photo:hero-menu"
                imageLabel="Menü kapağı"
                compact
                aside={(
                    <label className="flex h-[52px] w-full items-center gap-2.5 rounded-full border border-white/35 bg-white/15 px-[18px] text-white backdrop-blur-[10px] md:max-w-[360px]">
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                        <span className="sr-only">Menüde ara</span>
                        <input
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Menüde ara…"
                            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-white outline-none placeholder:text-white/75"
                        />
                    </label>
                )}
            >
                <span {...hoursT} className={cn('inline-flex items-center gap-2.5 text-sm text-white', hoursT.className)}>
                    {status && <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', site.isOpenNow ? 'bg-[#5EE08F]' : 'bg-[#F4A28C]')} />}
                    {[status, hoursLine(site), `${totalItems} ürün`].filter(Boolean).join(' · ')}
                </span>
            </PageHero>

            {/* Öne çıkanlar şeridi */}
            {showFeatured && (
                <ExternalHint source="menu">
                <section aria-labelledby="mn-secim" className="mx-auto flex w-full max-w-[1344px] flex-col gap-3 px-5 pt-6 md:gap-4 md:px-12 md:pt-10">
                    <div className="flex items-baseline gap-3">
                        <h2 id="mn-secim" className={cn(serif, 'm-0 text-[32px] leading-none md:text-[40px]')}>
                            {flagged.length > 0 ? <>Ustanın <span className="italic">seçimi</span></> : <>Öne <span className="italic">çıkanlar</span></>}
                        </h2>
                        <span className="text-sm text-[var(--site-muted)]">{featured.length} tabak</span>
                    </div>
                    <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-12 md:px-12">
                        {featured.map(p => <FeaturedTile key={p.id} product={p} />)}
                    </div>
                </section>
                </ExternalHint>
            )}

            {/* Kategori çubuğu */}
            {chips.length > 1 && (
                <nav aria-label="Kategoriler" className="sticky top-0 z-20 mt-5 border-y border-[var(--site-line)] bg-[color-mix(in_srgb,var(--site-bg)_94%,transparent)] backdrop-blur-[14px] md:mt-8">
                    <div ref={chipBar} className="mx-auto flex w-full max-w-[1344px] gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] md:px-12 md:py-3.5">
                        {chips.map(c => {
                            const on = active === c.id;
                            return (
                                <a key={c.id} href={`#${c.id}`} data-chip={c.id} aria-current={on ? 'location' : undefined}
                                    className={cn('flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-[18px] text-sm font-semibold no-underline transition-colors',
                                        on ? 'border-[var(--site-text)] bg-[var(--site-text)] text-[var(--site-bg)]' : 'border-[var(--site-line)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-text)]')}>
                                    {c.name}<span className="ml-1.5 font-medium opacity-60">{c.count}</span>
                                </a>
                            );
                        })}
                    </div>
                </nav>
            )}

            <ExternalHint source="menu" className="flex flex-1 flex-col">
            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-10 px-5 pb-12 pt-8 md:gap-14 md:px-12 md:pb-16 md:pt-12">
                {setMenus.length > 0 && (
                    <ExternalHint source="setMenus">
                    <section id={SET_MENUS_ID} aria-labelledby="mn-menuler" className="flex scroll-mt-[88px] flex-col gap-4 md:gap-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h2 id="mn-menuler" className={cn(serif, 'm-0 text-[40px] leading-none md:text-[52px]')}>Hazır <span className="italic">menüler.</span></h2>
                            {canOrder && <Link to="/siparis" className={cardLink}>Paket sipariş ver →</Link>}
                        </div>
                        <div className={cn('grid grid-cols-1 gap-4', setMenus.length > 1 && 'lg:grid-cols-2')}>
                            {setMenus.map(menu => <SetMenuRowCard key={menu.id} menu={menu} photoOf={photoOf} />)}
                        </div>
                    </section>
                    </ExternalHint>
                )}

                {site.categories.length === 0 && (site.setMenus ?? []).length === 0 ? (
                    <p className="m-0 text-lg text-[var(--site-muted)]">Menü henüz hazırlanıyor.</p>
                ) : nothingFound ? (
                    <p className="m-0 text-lg text-[var(--site-muted)]">“{query}” için sonuç yok. Başka bir şey deneyin.</p>
                ) : groups.map(g => {
                    const anyPhoto = g.category.products.some(p => p.imageUrl);
                    return (
                        <section key={g.id} id={g.id} aria-labelledby={`${g.id}-baslik`} className="flex scroll-mt-[88px] flex-col gap-4 md:gap-5">
                            <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                                <h2 id={`${g.id}-baslik`} className={cn(serif, 'm-0 text-[40px] leading-none md:text-[52px]')}>{g.category.name}</h2>
                                <span className="text-sm text-[var(--site-muted)]">{g.items.length} ürün</span>
                            </div>
                            {anyPhoto ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] sm:gap-3.5">
                                    {g.items.map(p => <MenuProductCard key={p.id} product={p} />)}
                                </div>
                            ) : (
                                <ClassicMenuList category={g.category} items={g.items} />
                            )}
                        </section>
                    );
                })}

                <MenuCta canOrder={canOrder} canReserve={canReserve} phone={site.phone} />
            </main>
            </ExternalHint>
        </SitePage>
    );
}

/** Sayfanın sonu: "Karar verdiniz mi?" koyu kartı. Sipariş/rezervasyon yoksa telefon; o da yoksa QR notu. */
function MenuCta({ canOrder, canReserve, phone }: { canOrder: boolean; canReserve: boolean; phone: string }) {
    if (!canOrder && !canReserve) {
        return (
            <p className="m-0 text-sm text-[var(--site-muted)]">
                Sipariş için masanızdaki QR kodu okutun{phone ? <> ya da bizi arayın: <a href={telHref(phone)} className="font-semibold text-[var(--site-text)] underline">{phone}</a></> : ''}.{' '}
                <Link to="/" className="font-semibold text-[var(--site-text)] underline">Ana sayfa</Link>
            </p>
        );
    }
    const sub = canOrder && canReserve
        ? 'Masanızı ayırtın ya da paket siparişi buradan verin.'
        : canOrder ? 'Paket siparişinizi buradan verin; kapınıza sıcak gelsin.' : 'Birkaç adımda masanızı ayırtın.';
    return (
        <section aria-labelledby="mn-karar" className={cn(siteCardDark, 'flex flex-wrap items-center justify-between gap-5 p-6 md:rounded-[24px] md:p-9')}>
            <div className="flex min-w-0 flex-col gap-2">
                <h2 id="mn-karar" className={cn(serif, 'm-0 text-[34px] leading-none md:text-[44px]')}>Karar verdiniz <span className="italic">mi?</span></h2>
                <p className="m-0 text-[15px] text-[var(--site-on-paper-sub)]">{sub}</p>
            </div>
            <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
                {canOrder && <Link to="/siparis" className={cn(canReserve ? cardButton.ghost : cardButton.accent, 'h-[52px] flex-1 px-6 text-[15px] sm:flex-none')}>Paket sipariş</Link>}
                {canReserve && <Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'h-[52px] flex-1 px-7 text-[15px] sm:flex-none')}>Masa ayırt</Link>}
            </div>
        </section>
    );
}
