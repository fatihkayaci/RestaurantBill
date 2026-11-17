import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { RESERVATION_PATH, foldText, serif } from './site/siteParts';
import { directionsUrl, formatSitePrice, telHref } from './site/siteTheme';
import { fullAddress, restaurantName, useSite } from './site/useSite';
import { EditableText, ExternalHint } from './site/siteEdit';
import { useSiteEdit, useSiteWindow } from './site/siteEditContext';

// Restoran sitesinin menü sayfası (tasarım: "Menü 1 · Basılı menü"). Krem sayfada tek beyaz kutu, basılı menü gibi:
// ortada restoran adı, dev "Menü", (varsa) alt başlık, arama ve süzgeçler (ustanın seçimi, 10 dk ve altı; verisi varsa);
// yapışkan kategori şeridi (alt çizgili bağlantılar, görünen bölüm vurgulu); hazır menüler ve kategoriler iki sütunlu
// "Ad ······ fiyat" satırları (fotoğraf varsa 60 px yuvarlak, yoksa yalnız yazı). Online sipariş açıkken + düğmeleri ve
// sepette ürün varken altta yapışkan "ürün sepette · toplam · Sepete git" çubuğu. Sıra admin'deki sıradır (API sıralı döner).

const SET_MENUS_ID = 'kat-hazir';
const FAST_MINUTES = 10;

/** Kaydırırken görünen bölümün kimliği (yapışkan şeridin hemen altındaki bölüm). */
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
            const line = 140;
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
    const edit = useSiteEdit();
    const [query, setQuery] = useState('');
    const [onlyFeatured, setOnlyFeatured] = useState(false);
    const [onlyFast, setOnlyFast] = useState(false);
    const [announce, setAnnounce] = useState('');
    const cart = useSiteCart();
    const canOrder = cart.enabled;
    const strip = useRef<HTMLDivElement>(null);

    const products = useMemo(() => site?.categories.flatMap(c => c.products) ?? [], [site]);
    const filtering = onlyFeatured || onlyFast;

    const groups = useMemo(() => {
        if (!site) return [];
        const q = foldText(query);
        return site.categories
            .map(category => ({
                id: `kat-${category.id}`,
                category,
                items: category.products.filter(p =>
                    (!q || foldText(`${p.name} ${p.description} ${category.name}`).includes(q))
                    && (!onlyFeatured || p.isFeatured)
                    && (!onlyFast || (!!p.prepMinutes && p.prepMinutes <= FAST_MINUTES))),
            }))
            .filter(g => g.items.length > 0);
    }, [site, query, onlyFeatured, onlyFast]);

    // Hazır menüler de aramaya girer (ad, açıklama, içindeki ürünler); ürün süzgeci açıkken gösterilmez.
    const setMenus = useMemo(() => {
        if (filtering) return [];
        const menus = site?.setMenus ?? [];
        const q = foldText(query);
        if (!q) return menus;
        return menus.filter(m => foldText([m.name, m.description, ...m.slots.flatMap(s => [s.name, ...s.options.map(o => o.productName)])].join(' ')).includes(q));
    }, [site, query, filtering]);

    const nav = useMemo(() => [
        ...(setMenus.length > 0 ? [{ id: SET_MENUS_ID, label: 'Hazır menüler' }] : []),
        ...groups.map(g => ({ id: g.id, label: g.category.name })),
    ], [groups, setMenus]);
    const active = useActiveSection(nav.map(n => n.id));

    // Görünen bölümün bağlantısı şeritte görünür kalsın (yalnız şerit yatay kayar).
    useEffect(() => {
        const bar = strip.current;
        const link = active ? bar?.querySelector<HTMLElement>(`[data-nav="${active}"]`) : null;
        if (!bar || !link || bar.scrollWidth <= bar.clientWidth) return;
        const left = link.offsetLeft;
        if (left < bar.scrollLeft || left + link.offsetWidth > bar.scrollLeft + bar.clientWidth) {
            bar.scrollTo({ left: Math.max(0, left - 24), behavior: 'smooth' });
        }
    }, [active]);

    if (!site) {
        return <SiteShell><SiteStatus error={error} /></SiteShell>;
    }

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
        on ? 'border-[var(--site-paper)] bg-[var(--site-paper)] text-[var(--site-on-paper)]' : 'border-[var(--site-border-mid)] text-[var(--site-text)] hover:border-[var(--site-text)]');

    return (
        // Başlık sayfayla kayar (stickyHeader={false}); üstte yapışık kalan yalnız kategori şeridi.
        <SitePage site={site} current="menu" stickyHeader={false} lastCall={false} mobileActions={mobileActions}>
            <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-2 pb-4 pt-4 sm:px-4">
                <section aria-labelledby="mn-baslik" className="rounded-[24px] bg-[var(--site-card)] px-5 pb-12 pt-10 text-[var(--site-text)] sm:px-10 md:rounded-[32px] lg:px-[72px] lg:pb-[72px] lg:pt-16">
                    {/* Başlık */}
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-[var(--site-muted)]">{name}</span>
                        <h1 id="mn-baslik" className={cn(serif, 'm-0 text-[80px] leading-[0.85] md:text-[clamp(80px,9vw,140px)]')}>Menü</h1>
                        {(site.site.tagline || edit?.showEmpty) && (
                            <div className="flex max-w-full items-center gap-3.5">
                                <span aria-hidden="true" className="h-px w-10 shrink-0 bg-[var(--site-border-mid)]" />
                                <EditableText field="tagline" value={site.site.tagline} placeholder="Alt başlık yazın"
                                    className={cn(serif, 'min-w-0 text-xl italic text-[var(--site-accent-text)]')} />
                                <span aria-hidden="true" className="h-px w-10 shrink-0 bg-[var(--site-border-mid)]" />
                            </div>
                        )}
                        {!edit && !menuEmpty && (
                            <div className="mt-2.5 flex w-full flex-col items-center gap-3">
                                <label className="flex h-14 w-full max-w-[460px] items-center gap-3 rounded-full bg-[var(--site-bg)] px-[22px] focus-within:ring-2 focus-within:ring-[var(--site-text)]">
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
                        {/* Yapışkan kategori şeridi */}
                        {nav.length > 1 && (
                            <nav aria-label="Kategoriler"
                                className="sticky top-0 z-[4] -mx-5 mt-10 border-y border-[var(--site-line)] bg-[var(--site-card)] sm:-mx-10 lg:-mx-[72px]">
                                <div ref={strip} className="overflow-x-auto px-5 [scrollbar-width:none] sm:px-10 lg:px-[72px]">
                                    <div className="mx-auto flex w-max gap-6 md:gap-8">
                                        {nav.map(n => {
                                            const on = active === n.id;
                                            return (
                                                <a key={n.id} href={`#${n.id}`} data-nav={n.id} aria-current={on ? 'location' : undefined}
                                                    className={cn('inline-flex min-h-[52px] shrink-0 items-center whitespace-nowrap border-b-2 px-0.5 pt-0.5 text-[15px] no-underline transition-colors',
                                                        on ? 'border-[var(--site-accent)] font-extrabold text-[var(--site-text)]' : 'border-transparent font-semibold text-[var(--site-muted)] hover:text-[var(--site-text)]')}>
                                                    {n.label}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            </nav>
                        )}

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
                                <section id={SET_MENUS_ID} aria-labelledby="mn-hazir" className="flex scroll-mt-16 flex-col gap-7 pt-14 md:pt-16">
                                    <SectionTitle id="mn-hazir" title="Hazır menüler" note={`${setMenus.length} menü`} />
                                    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-x-16 gap-y-[26px] p-0">
                                        {setMenus.map(menu => <SetMenuLine key={menu.id} menu={menu} cart={cart} />)}
                                    </ul>
                                </section>
                            </ExternalHint>
                        )}

                        {groups.map(g => (
                            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-baslik`} className="flex scroll-mt-16 flex-col gap-7 pt-14 md:pt-[72px]">
                                <SectionTitle id={`${g.id}-baslik`} title={g.category.name} note={`${g.items.length} ürün`} />
                                <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-x-16 gap-y-[22px] p-0">
                                    {g.items.map(p => <ProductLine key={p.id} product={p} cart={cart} onAdded={onAdded} />)}
                                </ul>
                            </section>
                        ))}
                        <p className="sr-only" aria-live="polite">{announce}</p>
                    </ExternalHint>
                </section>

                {showCartBar && (
                    <div className="pointer-events-none sticky bottom-4 z-[5] flex justify-center">
                        <Link to="/siparis" aria-label={`Sepete git: ${cart.count} ürün, ${formatSitePrice(cart.subtotal)}`}
                            className="pointer-events-auto flex h-16 max-w-full items-center gap-3 rounded-full bg-[var(--site-paper)] py-2 pl-5 pr-2 text-[var(--site-on-paper)] no-underline shadow-[0_16px_40px_rgba(30,26,22,0.3)] sm:gap-[18px] sm:pl-6">
                            <span className="inline-flex items-center gap-2.5 whitespace-nowrap font-bold">
                                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--site-on-paper)] px-2 text-[13px] font-extrabold tabular-nums text-[var(--site-paper)]">{cart.count}</span>
                                <span className="hidden sm:inline">ürün sepette</span>
                            </span>
                            <span aria-hidden="true" className="h-6 w-px bg-[rgba(246,241,233,0.2)]" />
                            <span className={cn(serif, 'whitespace-nowrap text-[24px] tabular-nums sm:text-[26px]')}>{formatSitePrice(cart.subtotal)}</span>
                            <span className="inline-flex h-12 items-center whitespace-nowrap rounded-full bg-[var(--site-accent)] px-5 font-extrabold text-[var(--site-on-accent)]">Sepete git →</span>
                        </Link>
                    </div>
                )}
            </main>
        </SitePage>
    );
}

/** Bölüm başlığı: iki yanında ince çizgi, ortada italik serif ad; altında kısa not (ürün sayısı). */
function SectionTitle({ id, title, note }: { id: string; title: string; note: string }) {
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="flex w-full items-center gap-4 md:gap-[22px]">
                <span aria-hidden="true" className="h-px flex-1 bg-[rgba(30,26,22,0.15)]" />
                <h2 id={id} className={cn(serif, 'm-0 max-w-[80%] break-words text-center text-[40px] italic leading-none md:text-[48px]')}>{title}</h2>
                <span aria-hidden="true" className="h-px flex-1 bg-[rgba(30,26,22,0.15)]" />
            </div>
            <span className="text-[13px] text-[var(--site-muted)]">{note}</span>
        </div>
    );
}

/** "+" düğmesi; sepetteyse vurgu renginde "2 ✓". Online sipariş kapalıysa ya da ürün pakette yoksa çizilmez. */
function LineButton({ label, qty, onClick }: { label: string; qty: number; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-label={qty > 0 ? `${label} (sepette ${qty})` : label}
            className={cn('flex h-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90',
                qty > 0 ? 'min-w-11 bg-[var(--site-accent)] px-3 text-sm font-extrabold text-[var(--site-on-accent)]' : 'w-11 border border-[rgba(30,26,22,0.22)] bg-[var(--site-card)] text-[22px] leading-none text-[var(--site-text)]')}>
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
                    <img src={product.imageUrl} alt={product.name} title={product.isStockImage ? 'Temsili görsel' : undefined} loading="lazy" className="block h-[60px] w-[60px] rounded-full bg-[var(--site-placeholder)] object-cover" />
                    {product.isStockImage && <span className="sr-only"> (temsili görsel)</span>}
                </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline gap-2.5">
                    <h3 className={cn(serif, 'm-0 min-w-0 break-words text-[23px] leading-[1.1] md:text-[25px]', product.isOutOfStock && 'text-[var(--site-muted)]')}>{product.name}</h3>
                    <span aria-hidden="true" className="min-w-5 flex-1 -translate-y-1.5 border-b border-dotted border-[rgba(30,26,22,0.35)]" />
                    <span className="shrink-0 whitespace-nowrap text-[17px] font-extrabold tabular-nums">{formatSitePrice(product.price)}</span>
                </div>
                {(meta || tag) && (
                    <p className="m-0 text-[13px] leading-snug text-[var(--site-muted)]">
                        {meta}
                        {tag && <span className={cn(serif, 'text-base italic', product.isOutOfStock ? 'text-[var(--site-muted)]' : 'text-[var(--site-accent-text)]')}>{meta ? ' · ' : ''}{tag}</span>}
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
    if (!menu.isAvailable) action = <span className="shrink-0 pt-1 text-sm font-bold text-[var(--site-muted)]">Tükendi</span>;
    else if (found?.menu.isAvailable) {
        action = found.needsChoice
            ? <Link to="/siparis" aria-label={`${menu.name}: seçerek sepete ekle`} className="inline-flex h-11 shrink-0 items-center rounded-full border border-[rgba(30,26,22,0.22)] px-4 text-sm font-bold text-[var(--site-text)] no-underline hover:border-[var(--site-text)]">Seç</Link>
            : <LineButton label={`${menu.name} sepete ekle`} qty={qty} onClick={() => cart.addSetMenu(menu.id)} />;
    }
    return (
        <li className="flex min-w-0 items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline gap-2.5">
                    <h3 className={cn(serif, 'm-0 min-w-0 break-words text-[24px] leading-[1.1] md:text-[26px]')}>{menu.name}</h3>
                    <span aria-hidden="true" className="min-w-5 flex-1 -translate-y-1.5 border-b border-dotted border-[rgba(30,26,22,0.35)]" />
                    <span className="shrink-0 whitespace-nowrap">
                        {saving && <s className="mr-1.5 text-[13px] text-[var(--site-muted)]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(menu.regularPrice)}</s>}
                        <span className="text-[17px] font-extrabold tabular-nums">{saving && <span className="sr-only">Menü fiyatı </span>}{formatSitePrice(menu.price)}</span>
                    </span>
                </div>
                <div className="text-[13px] leading-[1.55] text-[var(--site-muted)]">
                    {saving && <span className="font-extrabold text-[var(--site-accent-text)]">{saving} · </span>}
                    {menu.description && <span>{menu.description} · </span>}
                    <SlotsSummary menu={menu} className="inline" />
                </div>
            </div>
            {action}
        </li>
    );
}
