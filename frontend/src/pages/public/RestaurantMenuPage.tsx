import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicProduct } from '@/features/customerSite/types';
import { useOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { cn } from '@/lib/utils';
import { StockImageLabel } from './components/StockImageLabel';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageHero, SitePage } from './site/SiteFrame';
import { SetMenuRowCard } from './site/SiteSetMenus';
import { productPhotos } from './site/setMenuParts';
import { cardLink, serif } from './site/siteParts';
import { formatSitePrice, wordmarkParts } from './site/siteTheme';
import { hoursText, restaurantName, useSite } from './site/useSite';

// Restoran sitesinin menü sayfası (kart dili; İletişim/Hakkımızda/Mekân ile aynı bej görünüm).
// Kısa kapakta durum satırı ve cam arama kutusu; yapışkan kategori çubuğu (görünen bölümün çipi koyu);
// en üstte varsa "Hazır menüler" (indirim rozeti, üstü çizili normal fiyat), sonra kategoriler ve yatay ürün kartları.
// Sepet ve sipariş yok: menü yalnızca gösterilir.

const SET_MENUS_ID = 'menuler';

/** Kaydırırken görünen bölümün kimliği (çubuğun hemen altındaki bölüm). */
function useActiveSection(ids: string[]): string | null {
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
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top - line <= 0) current = id;
            }
            setActive(current ?? list[0]);
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [key]);
    return active;
}

/** Yatay ürün kartı: solda ad, açıklama, fiyat; sağda kare görsel (yoksa restoran adlı bej panel). */
function MenuItemCard({ product, restaurant }: { product: PublicProduct; restaurant: string }) {
    const thumb = 'h-24 w-24 shrink-0 rounded-[14px] md:h-[116px] md:w-[116px]';
    return (
        <article className="flex min-w-0 items-stretch gap-4 rounded-[20px] border border-[#E6E0D6] bg-white p-3.5 text-[#141414]">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5 py-1">
                {product.isFeatured && (
                    <span className="self-start rounded-full bg-[#F6E2D9] px-2.5 py-[3px] text-[11px] font-bold tracking-[0.04em] text-[#B8401A]">Ustanın seçimi</span>
                )}
                <h3 className="m-0 break-words text-[17px] font-bold leading-snug">{product.name}</h3>
                {product.description?.trim() && <p className="m-0 text-sm leading-[1.45] text-[#5E5850]">{product.description}</p>}
                <span className="mt-auto whitespace-nowrap pt-1 text-[17px] font-bold">{formatSitePrice(product.price)}</span>
            </div>
            {product.imageUrl ? (
                <div className="relative shrink-0">
                    <img src={product.imageUrl} alt={product.name} loading="lazy" className={cn(thumb, 'block bg-[#EFEBE4] object-cover')} />
                    {product.isStockImage && <StockImageLabel />}
                </div>
            ) : (
                <div aria-hidden="true" className={cn(thumb, 'flex items-center justify-center bg-[#EFEBE4] px-2 text-center')}>
                    <span className={cn(serif, 'min-w-0 break-words text-lg italic leading-tight text-[#8A8378]')}>
                        {wordmarkParts(restaurant).first}<span className="text-[var(--site-accent)]">·</span>
                    </span>
                </div>
            )}
        </article>
    );
}

export default function RestaurantMenuPage() {
    const { site, error } = useSite();
    const [query, setQuery] = useState('');
    const canOrder = useOnlineOrderingAvailable();
    const chipBar = useRef<HTMLDivElement>(null);

    const groups = useMemo(() => {
        if (!site) return [];
        const q = query.trim().toLocaleLowerCase('tr-TR');
        return site.categories
            .map(category => ({
                id: `kat-${category.id}`,
                name: category.name,
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
        ...groups.map(g => ({ id: g.id, name: g.name, count: g.items.length })),
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
    const hours = hoursText(site);
    const totalItems = site.categories.reduce((sum, c) => sum + c.products.length, 0);
    const status = site.isOpenNow === null ? null : site.isOpenNow ? 'Şu an açık' : 'Şu an kapalı';
    const photoOf = productPhotos(site.categories.flatMap(c => c.products));
    const nothingFound = groups.length === 0 && setMenus.length === 0;

    return (
        // Başlık sayfayla kayar (stickyHeader={false}); üstte sabit kalan yalnız kategori çubuğu.
        <SitePage site={site} current="menu" stickyHeader={false}>
            <PageHero
                site={site}
                label={name}
                title="Menü"
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
                <span className="inline-flex items-center gap-2.5 text-sm text-white">
                    {status && <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', site.isOpenNow ? 'bg-[#5EE08F]' : 'bg-[#F4A28C]')} />}
                    {[status, hours && `Her gün ${hours}`, `${totalItems} ürün`].filter(Boolean).join(' · ')}
                </span>
            </PageHero>

            {/* Kategori çubuğu */}
            {chips.length > 1 && (
                <nav aria-label="Kategoriler" className="sticky top-0 z-20 border-b border-[#DDD7CE] bg-[rgba(244,241,236,0.94)] backdrop-blur-[14px]">
                    <div ref={chipBar} className="mx-auto flex w-full max-w-[1344px] gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] md:px-12 md:py-3.5">
                        {chips.map(c => {
                            const on = active === c.id;
                            return (
                                <a key={c.id} href={`#${c.id}`} data-chip={c.id} aria-current={on ? 'location' : undefined}
                                    className={cn('flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-[18px] text-sm font-semibold no-underline transition-colors',
                                        on ? 'border-[#141414] bg-[#141414] text-white' : 'border-[#DDD7CE] bg-white text-[#141414] hover:border-[#141414]')}>
                                    {c.name}<span className="ml-1.5 font-medium opacity-60">{c.count}</span>
                                </a>
                            );
                        })}
                    </div>
                </nav>
            )}

            <main className="mx-auto flex w-full max-w-[1344px] flex-1 flex-col gap-10 px-5 pb-14 pt-8 md:gap-14 md:px-12 md:pb-20 md:pt-12">
                {setMenus.length > 0 && (
                    <section id={SET_MENUS_ID} aria-labelledby="mn-menuler" className="flex scroll-mt-[88px] flex-col gap-4 md:gap-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <h2 id="mn-menuler" className={cn(serif, 'm-0 text-[40px] leading-none md:text-[52px]')}>Hazır <span className="italic">menüler.</span></h2>
                            {canOrder && <Link to="/siparis" className={cardLink}>Paket sipariş ver →</Link>}
                        </div>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,520px),1fr))]">
                            {setMenus.map(menu => <SetMenuRowCard key={menu.id} menu={menu} photoOf={photoOf} />)}
                        </div>
                    </section>
                )}

                {site.categories.length === 0 && (site.setMenus ?? []).length === 0 ? (
                    <p className="m-0 text-lg text-[#6F6A63]">Menü henüz hazırlanıyor.</p>
                ) : nothingFound ? (
                    <p className="m-0 text-lg text-[#6F6A63]">“{query}” için sonuç yok. Başka bir şey deneyin.</p>
                ) : groups.map(g => (
                    <section key={g.id} id={g.id} aria-labelledby={`${g.id}-baslik`} className="flex scroll-mt-[88px] flex-col gap-4 md:gap-5">
                        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                            <h2 id={`${g.id}-baslik`} className={cn(serif, 'm-0 text-[40px] leading-none md:text-[52px]')}>{g.name}</h2>
                            <span className="text-sm text-[#6F6A63]">{g.items.length} ürün</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] sm:gap-3.5">
                            {g.items.map(p => <MenuItemCard key={p.id} product={p} restaurant={name} />)}
                        </div>
                    </section>
                ))}
                <p className="m-0 text-sm text-[#6F6A63]">
                    Sipariş için masanızdaki QR kodu okutun{site.phone ? ' ya da bizi arayın' : ''}. <Link to="/" className="font-semibold text-[#141414] underline">Ana sayfa</Link>
                </p>
            </main>
        </SitePage>
    );
}
