import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { canReserveOnline } from '@/features/customerSite/types';
import { useSiteCart } from '@/features/delivery/useSiteCart';
import { cn } from '@/lib/utils';
import { SiteShell, SiteStatus } from './site/SiteChrome';
import { PageHero, SitePage } from './site/SiteFrame';
import type { MobileAction } from './site/siteActions';
import { BagIcon, CalendarIcon, DirectionsIcon, PhoneIcon } from './site/SiteCards';
import { AddButton, CartPanel, CategoryRail, MenuRow, MenuSearch, SetMenuSection } from './site/SiteMenuBoard';
import { RESERVATION_PATH, cardButton, foldText, productCount, sectionWrap, serif, siteCardDark } from './site/siteParts';
import { directionsUrl, telHref } from './site/siteTheme';
import { fullAddress, hoursLine, restaurantName, useSite } from './site/useSite';
import { editTarget, useSiteEdit, useSiteWindow } from './site/siteEditContext';
import { ExternalHint } from './site/siteEdit';

// Restoran sitesinin menü sayfası (Tema 2 menü panosu): açık kapakta durum satırı ve arama; altında solda kategori rayı
// (telefonda üstte yapışık yatay çipler), ortada bütün kategoriler satır satır (varsa 84 px fotoğraf, serif ad, noktalı
// çizgi, fiyat, açıklama/süre, "ustanın seçimi"), online sipariş açıksa + düğmeleri ve koyu sepet paneli; ardından hazır
// menüler ve "Karar verdiniz mi?" kartı. Fotoğrafsız ürün yalnız yazıdır.

const SET_MENUS_ID = 'menuler';

/** Kaydırırken görünen bölümün kimliği (yapışkan çubuğun hemen altındaki bölüm). */
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
            const line = 120;
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
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const chipBar = useRef<HTMLDivElement>(null);
    const [announce, setAnnounce] = useState('');
    const hoursT = editTarget(useSiteEdit(), 'hours', 'Çalışma saatleri');

    const groups = useMemo(() => {
        if (!site) return [];
        const q = foldText(query);
        return site.categories
            .map(category => ({
                id: `kat-${category.id}`,
                category,
                items: q
                    ? category.products.filter(p => foldText(`${p.name} ${p.description} ${category.name}`).includes(q))
                    : category.products,
            }))
            .filter(g => g.items.length > 0);
    }, [site, query]);

    // Hazır menüler de aramaya girer (ad, açıklama, içindeki ürünler).
    const setMenus = useMemo(() => {
        const menus = site?.setMenus ?? [];
        const q = foldText(query);
        if (!q) return menus;
        return menus.filter(m => foldText([m.name, m.description, ...m.slots.flatMap(s => [s.name, ...s.options.map(o => o.productName)])].join(' ')).includes(q));
    }, [site, query]);

    const chips = useMemo(() => [
        ...groups.map(g => ({ id: g.id, label: g.category.name, count: g.items.length })),
        ...(setMenus.length > 0 ? [{ id: SET_MENUS_ID, label: 'Hazır menüler', count: setMenus.length }] : []),
    ], [groups, setMenus]);
    const active = useActiveSection(chips.map(c => c.id));

    // Görünen bölümün çipi çubukta görünür kalsın (yalnız çubuk yatay kayar, sayfa değil).
    useEffect(() => {
        const bar = chipBar.current;
        const chip = active ? bar?.querySelector<HTMLElement>(`[data-chip="${active}"]`) : null;
        if (!bar || !chip || bar.scrollWidth <= bar.clientWidth) return;
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
    const nothingFound = groups.length === 0 && setMenus.length === 0;
    const canReserve = canReserveOnline(site);
    const address = fullAddress(site);
    const onAdded = (product: string) => setAnnounce(`${product} sepete eklendi.`);

    // Telefonun alt çubuğu: Ara · (Sepet | Paket sipariş | Masa ayırt | Yol tarifi).
    const mobileActions: MobileAction[] = [];
    if (site.phone) mobileActions.push({ key: 'ara', label: 'Ara', icon: <PhoneIcon className="h-[18px] w-[18px]" />, href: telHref(site.phone) });
    if (canOrder) mobileActions.push({ key: 'paket', label: cart.count > 0 ? `Sepet · ${cart.count} ürün` : 'Paket sipariş', icon: <BagIcon className="h-[18px] w-[18px]" />, to: '/siparis', primary: true });
    else if (canReserve) mobileActions.push({ key: 'rez', label: 'Masa ayırt', icon: <CalendarIcon className="h-[18px] w-[18px]" />, to: RESERVATION_PATH, primary: true });
    else if (address) mobileActions.push({ key: 'yol', label: 'Yol tarifi', icon: <DirectionsIcon className="h-[18px] w-[18px]" />, href: directionsUrl(address) });

    return (
        // Başlık sayfayla kayar (stickyHeader={false}); üstte yapışık kalan yalnız kategori çubuğu.
        <SitePage site={site} current="menu" stickyHeader={false} lastCall={false} mobileActions={mobileActions}>
            <PageHero
                site={site}
                label={name}
                title="Menü"
                image={site.site.menuHeroUrl}
                imageTarget="photo:hero-menu"
                imageLabel="Menü kapağı"
                compact
                aside={<MenuSearch value={query} onChange={setQuery} className="bg-[var(--site-card)] md:w-[360px]" />}
            >
                <span {...hoursT} className={cn('inline-flex items-center gap-2.5 text-[15px] font-semibold text-[var(--site-sub)]', hoursT.className)}>
                    {status && <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', site.isOpenNow ? 'bg-[#2FA866]' : 'bg-[#C8472C]')} />}
                    {[status, hoursLine(site), `${totalItems} ürün`].filter(Boolean).join(' · ')}
                </span>
            </PageHero>

            {/* Telefonda yapışkan kategori çipleri */}
            {chips.length > 1 && (
                <div className="sticky top-0 z-20 border-b border-[var(--site-line)] bg-[color-mix(in_srgb,var(--site-bg)_94%,transparent)] py-2.5 backdrop-blur-[14px] lg:hidden">
                    <div className={sectionWrap}>
                        <CategoryRail linkMode items={chips} selected={active} innerRef={chipBar} />
                    </div>
                </div>
            )}

            <ExternalHint source="menu" className="flex flex-1 flex-col">
            <main className={cn(sectionWrap, 'flex flex-1 flex-col gap-6 pb-16 pt-10 lg:flex-row lg:flex-wrap lg:items-start lg:gap-10 lg:pt-14 xl:flex-nowrap')}>
                {chips.length > 1 && (
                    <CategoryRail linkMode items={chips} selected={active} label="Kategoriler (yan)"
                        className="hidden lg:sticky lg:top-6 lg:flex lg:w-[220px] lg:shrink-0" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-12">
                    {site.categories.length === 0 && (site.setMenus ?? []).length === 0 ? (
                        <p className="m-0 text-lg text-[var(--site-muted)]">Menü henüz hazırlanıyor.</p>
                    ) : nothingFound ? (
                        <p className="m-0 text-lg text-[var(--site-muted)]">“{query}” için sonuç yok. Başka bir şey deneyin.</p>
                    ) : groups.map(g => (
                        <section key={g.id} id={g.id} aria-labelledby={`${g.id}-baslik`} className="flex scroll-mt-24 flex-col">
                            <div className="mb-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                                <h2 id={`${g.id}-baslik`} className={cn(serif, 'm-0 text-[34px] italic leading-tight text-[var(--site-accent-text)] md:text-[40px]')}>{g.category.name}</h2>
                                <span className="text-sm text-[var(--site-muted)]">{g.items.length} ürün</span>
                            </div>
                            <ul className="m-0 list-none p-0">
                                {g.items.map(p => <MenuRow key={p.id} product={p} action={<AddButton product={p} cart={cart} onAdded={onAdded} />} />)}
                            </ul>
                        </section>
                    ))}
                </div>
                {canOrder && <CartPanel cart={cart} />}
                <p className="sr-only" aria-live="polite">{announce}</p>
            </main>
            </ExternalHint>

            <ExternalHint source="setMenus">
                <div className="scroll-mt-24"><SetMenuSection site={site} cart={cart} menus={setMenus} /></div>
            </ExternalHint>

            <section className={cn(sectionWrap, 'py-12 md:py-16')}>
                <MenuCta canOrder={canOrder} canReserve={canReserve} phone={site.phone} />
            </section>
        </SitePage>
    );
}

/** Sayfanın sonu: "Karar verdiniz mi?" koyu kartı. Sipariş/rezervasyon yoksa telefon; o da yoksa QR notu. */
function MenuCta({ canOrder, canReserve, phone }: { canOrder: boolean; canReserve: boolean; phone: string }) {
    if (!canOrder && !canReserve) {
        return (
            <p className="m-0 text-[15px] text-[var(--site-sub)]">
                Sipariş için masanızdaki QR kodu okutun{phone ? <> ya da bizi arayın: <a href={telHref(phone)} className="font-bold text-[var(--site-text)] underline">{phone}</a></> : ''}.{' '}
                <Link to="/" className="font-bold text-[var(--site-text)] underline">Ana sayfa</Link>
            </p>
        );
    }
    const sub = canOrder && canReserve
        ? 'Masanızı ayırtın ya da paket siparişi buradan verin.'
        : canOrder ? 'Paket siparişinizi buradan verin; kapınıza sıcak gelsin.' : 'Birkaç adımda masanızı ayırtın.';
    return (
        <section aria-labelledby="mn-karar" className={cn(siteCardDark, 'flex flex-wrap items-center justify-between gap-5 p-6 md:p-9')}>
            <div className="flex min-w-0 flex-col gap-2">
                <h2 id="mn-karar" className={cn(serif, 'm-0 text-[36px] leading-none md:text-[48px]')}>Karar verdiniz <span className="italic">mi?</span></h2>
                <p className="m-0 text-[15px] text-[var(--site-on-paper-sub)]">{sub}</p>
            </div>
            <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
                {canOrder && <Link to="/siparis" className={cn(canReserve ? cardButton.ghost : cardButton.accent, 'h-[52px] flex-1 px-6 text-[15px] sm:flex-none')}>Paket sipariş</Link>}
                {canReserve && <Link to={RESERVATION_PATH} className={cn(cardButton.accent, 'h-[52px] flex-1 px-7 text-[15px] sm:flex-none')}>Masa ayırt</Link>}
            </div>
        </section>
    );
}
