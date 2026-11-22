import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PublicCategory, PublicSite } from '@/features/customerSite/types';
import { estimatedSubtotal, itemCount, type DeliveryCartLine } from '@/features/delivery/deliveryCart';
import { listNames } from '@/features/delivery/deliveryText';
import { useOrderSession } from '@/features/delivery/useOrderSession';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { cn } from '@/lib/utils';
import { SitePage } from '../../SiteFrame';
import { serif } from '../../siteParts';
import { formatSitePrice } from '../../siteTheme';
import { restaurantName } from '../../useSite';
import { EditableText } from '../../siteEdit';
import { useSiteEdit, useSiteWindow } from '../../siteEditContext';
import { SET_MENUS_ID, useMenuView } from '../../useMenuView';
import type { DesignPageProps } from '../registry';
import { SophraCheckout } from './SophraCheckout';
import { ArrowGlyph, BagGlyph } from './SophraIcons';
import { CartLineList, CartTotalsBlock, ItemCard, ItemDetail, ItemRow, SpModal, type CartImage, type CartSummary } from './SophraMenuParts';
import {
    categoryLayout, newDraft, productItem, setMenuItem, type ItemDraft, type MenuItem, type MenuProductLike, type MenuTag,
} from './sophraMenuModel';
import { SOPHRA_CSS, spButton, spCard, spWrap } from './sophraParts';

// Sophra menü sayfası (online sipariş burada; ayrı paket sipariş sayfası yok, /siparis buraya yönlenir). Üstte küçük
// kapak (başlık, alt başlık, sipariş durumu); solda (masaüstü) yapışkan kategori listesi, telefonda yatay kaydırılan
// şerit (görünen bölüm işaretli); arama ve veri varsa süzgeçler (Önerilen, Yeni, Popüler). Her kategori admin'in seçtiği
// görünümle (otomatik: fotoğraflı ürün yarıdan azsa liste) kart ya da satır. Ürüne tıklanınca detay (seçim, not, adet,
// canlı toplam; seçimler kapatıp açınca korunur); "+" seçimsiz ekler (hazır menü varsayılan seçimlerle). Sağda (geniş
// ekranda) yapışkan sepet, telefonda alttaki "Sepetim" çubuğu. Ödeme adımlı (SophraCheckout). Online sipariş yoksa menü
// yalnız gösterilir.

const CHIPS: { tag: MenuTag; label: string }[] = [
    { tag: 'featured', label: 'Önerilen' },
    { tag: 'new', label: 'Yeni' },
    { tag: 'popular', label: 'Popüler' },
];

interface Category { id: string; name: string; menuDisplay?: PublicCategory['menuDisplay']; products: MenuProductLike[] }

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function SophraMenu({ site }: DesignPageProps) {
    const edit = useSiteEdit();
    const win = useSiteWindow();
    const session = useOrderSession();
    const online = session.enabled && !edit ? session.data : null;
    const [chip, setChip] = useState<MenuTag | null>(null);
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [announce, setAnnounce] = useState('');
    const name = restaurantName(site);

    // Sipariş açıkken paket menüsü (sepete eklenebilen kimlikler), değilse sitenin menüsü.
    const categories: Category[] = useMemo(() => online ? online.categories : site.categories, [online, site.categories]);
    const setMenus: OnlineSetMenu[] = useMemo(() => (online ? online.setMenus : site.setMenus ?? []).filter(m => m.slots.length > 0), [online, site.setMenus]);
    const popular = useMemo(() => new Set(online?.popularProductIds ?? []), [online]);
    const all = categories.flatMap(c => c.products);
    const available = {
        featured: all.some(p => p.isFeatured) || setMenus.some(m => m.isFeatured),
        new: all.some(p => p.isNew),
        popular: all.some(p => popular.has(p.id)),
    };

    // Süzgeç: seçilen etiketi taşıyan ürünler (Önerilen'de öne çıkan menüler de); arama ve şerit useMenuView'da.
    const viewSite: PublicSite = useMemo(() => {
        const keep = (p: MenuProductLike) => !chip || (chip === 'featured' ? p.isFeatured : chip === 'new' ? !!p.isNew : popular.has(p.id));
        return {
            ...site,
            categories: categories.map(c => ({
                id: c.id, name: c.name, menuDisplay: c.menuDisplay,
                products: c.products.filter(keep).map(p => ({ ...p, prepMinutes: null, isNew: p.isNew })),
            })).filter(c => c.products.length > 0),
            setMenus: chip && chip !== 'featured' ? [] : setMenus.filter(m => !chip || m.isFeatured),
        };
    }, [site, categories, setMenus, chip, popular]);
    const { query, setQuery, groups, setMenus: shownMenus, nav, active, strip } = useMenuView(viewSite);

    const items = useMemo(() => {
        const map = new Map<string, MenuItem>();
        for (const c of categories) for (const p of c.products) { const it = productItem(p, popular); map.set(it.key, it); }
        for (const m of setMenus) { const it = setMenuItem(m); map.set(it.key, it); }
        return map;
    }, [categories, setMenus, popular]);

    const canAdd = !!online;
    const qty = (item: MenuItem) => session.lines
        .filter(l => item.kind === 'product' ? l.kind === 'product' && l.productId === item.id : l.kind === 'setMenu' && l.setMenuId === item.id)
        .reduce((s, l) => s + l.quantity, 0);
    const quickAdd = (item: MenuItem) => {
        if (item.soldOut) { setOpenKey(item.key); return; }
        if (item.product) session.addProduct(item.product);
        else if (item.setMenu) session.addSetMenu(item.setMenu);
        setAnnounce(`${item.name} sepete eklendi.`);
    };
    const quickRemove = (item: MenuItem) => {
        const last = [...session.lines].reverse().find(l => item.kind === 'product' ? l.productId === item.id : l.setMenuId === item.id);
        if (last) session.changeLine(last.key, -1);
    };
    const opened = openKey ? items.get(openKey) ?? null : null;
    const draft = opened ? drafts[opened.key] ?? newDraft(opened) : null;
    const addFromDetail = () => {
        if (!opened || !draft) return;
        if (opened.product) session.addProduct(opened.product, draft.quantity, draft.note);
        else if (opened.setMenu) session.addSetMenu(opened.setMenu, draft.selections, draft.quantity, draft.note);
        setDrafts(d => { const next = { ...d }; delete next[opened.key]; return next; });
        setOpenKey(null);
        setAnnounce(`${opened.name} sepete eklendi.`);
    };

    // ── Sepet özeti ──
    const data = session.data;
    const quote = session.quote.quote;
    const zone = data && !session.pickup ? data.zones.find(z => z.id === session.zoneId) ?? null : null;
    const subtotal = quote?.subtotal ?? estimatedSubtotal(session.lines);
    // Mahalle seçilmeden teslimat ücreti bilinmez (sunucu teklifi o zaman 0 döner).
    const fee = session.pickup ? 0 : zone ? quote?.deliveryFee ?? zone.fee : null;
    const summary: CartSummary = { subtotal, fee, pickup: session.pickup, zoneName: zone?.name ?? null, total: quote?.total ?? subtotal + (fee ?? 0) };
    const count = itemCount(session.lines);
    const images = useMemo(() => new Map([...items.values()].map(it => [it.key, { src: it.imageUrl, stock: it.isStockImage }])), [items]);
    const imageOf = (line: DeliveryCartLine): CartImage => images.get(line.kind === 'product' ? `p:${line.productId}` : `s:${line.setMenuId}`) ?? { src: '', stock: false };
    const status = online ? (online.state === 'open'
        ? (online.lastOrderAt ? `Sipariş alıyoruz, ${timeOfDay(online.lastOrderAt)}'e kadar` : 'Sipariş alıyoruz')
        : online.state === 'paused' ? 'Siparişe kısa bir ara verildi' : online.message || 'Şu an sipariş alınmıyor') : null;
    const closedNote = online && !session.open ? status : null;

    const goTo = (e: MouseEvent, id: string) => {
        const el = win.document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };
    const startCheckout = () => { setCartOpen(false); setCheckoutOpen(true); };

    // ?sepet=1 (başlıktaki sepet simgesi, "Sepete git"): sepet açılır. Telefonda/tablette alttan açılan sepet penceresi,
    // geniş ekranda sağdaki sepet zaten görünür, odak oraya gider. Adres çubuğundan kalkar (geri tuşu sepeti yeniden açmaz).
    const [params, setParams] = useSearchParams();
    const asideRef = useRef<HTMLHeadingElement>(null);
    const wantsCart = params.get('sepet') === '1';
    const sessionLoaded = session.data !== null;
    const wideCart = () => !!win.matchMedia?.('(min-width: 1280px)').matches;
    // Pencere açma işlenirken (render sırasında, bir kez); adres temizliği ve odak effect'te.
    const [cartParamDone, setCartParamDone] = useState(false);
    if (wantsCart && sessionLoaded && !cartParamDone) {
        setCartParamDone(true);
        if (canAdd && !edit && !wideCart()) setCartOpen(true);
    } else if (!wantsCart && cartParamDone) {
        setCartParamDone(false);
    }
    useEffect(() => {
        if (!wantsCart || !sessionLoaded) return;
        if (canAdd && !edit && win.matchMedia?.('(min-width: 1280px)').matches) asideRef.current?.focus();
        const next = new URLSearchParams(params);
        next.delete('sepet');
        setParams(next, { replace: true });
    }, [wantsCart, sessionLoaded, canAdd, edit, win, params, setParams]);
    const showBar = canAdd && count > 0;

    const cartBody = (
        <>
            {session.droppedNames.length > 0 && (
                <p className="m-0 mb-3 rounded-xl bg-[var(--site-alt)] px-3 py-2 text-[14px]">{listNames(session.droppedNames)} artık menüde yok ya da tükendi; sepetten çıkarıldı.</p>
            )}
            {session.lines.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <BagGlyph className="h-8 w-8 text-[var(--site-muted)]" />
                    <p className="m-0 font-bold">Sepetiniz boş</p>
                    <p className="m-0 text-[14px] text-[var(--site-sub)]">Menüden “+” ile ürün ekleyin.</p>
                </div>
            ) : (
                <CartLineList lines={session.lines} quote={quote} restaurant={name} imageOf={imageOf} onChange={session.changeLine} onRemove={session.removeLine} />
            )}
        </>
    );
    const cartFooter = session.lines.length > 0 ? (
        <div className="flex flex-col gap-3">
            <CartTotalsBlock summary={summary} />
            {closedNote && <p className="m-0 rounded-xl bg-[var(--site-alt)] px-3 py-2 text-[14px] font-medium">{closedNote}</p>}
            <button type="button" onClick={startCheckout} disabled={!session.open} className={cn(spButton.accent, 'min-h-[56px] w-full disabled:opacity-50')}>
                Siparişe devam et<ArrowGlyph />
            </button>
        </div>
    ) : null;

    const chipsShown = CHIPS.filter(c => available[c.tag]);
    const nothing = groups.length === 0 && shownMenus.length === 0;
    const menuEmpty = categories.length === 0 && setMenus.length === 0;
    const heroImage = site.site.menuHeroUrl || site.site.coverImageUrl;

    return (
        <SitePage site={site} current="menu" mobileActions={showBar ? [] : undefined}>
            <style>{SOPHRA_CSS}</style>
            <main className={cn('flex flex-1 flex-col', showBar && 'pb-24 xl:pb-0')}>
                <section aria-labelledby="sp-menu-baslik" className="relative isolate overflow-hidden bg-[var(--site-hero-deep)] text-[var(--site-on-paper)]">
                    {heroImage && <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />}
                    <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--site-hero-deep)_20%,color-mix(in_srgb,var(--site-hero-deep)_55%,transparent))]" />
                    <div className={cn(spWrap, 'flex flex-col gap-3 py-10 sm:py-14')}>
                        <h1 id="sp-menu-baslik" className={cn(serif, 'm-0 text-[44px] leading-none sm:text-[60px]')}>Menü</h1>
                        {(site.site.tagline || edit?.showEmpty) && (
                            <EditableText as="p" field="tagline" value={site.site.tagline} placeholder="Kısa bir giriş cümlesi"
                                className="m-0 max-w-[56ch] text-[17px] leading-relaxed text-[var(--site-on-paper-sub)]" />
                        )}
                        {status && (
                            <p className="m-0 mt-1 inline-flex items-center gap-2 self-start rounded-full border border-[var(--site-paper-line-strong)] px-3.5 py-1.5 text-[14px] font-semibold">
                                <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', session.open ? 'bg-[var(--site-dot-ok)]' : 'bg-[var(--site-dot-bad)]')} />
                                {status}{online && online.branches.length > 1 && <span className="font-normal text-[var(--site-on-paper-sub)]"> · {online.branchName}</span>}
                            </p>
                        )}
                    </div>
                </section>

                {/* Telefon ve tablet: yapışkan yatay kategori şeridi. */}
                {nav.length > 1 && (
                    <nav aria-label="Kategoriler" className="sticky top-[68px] z-30 border-b border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-bg)_94%,transparent)] backdrop-blur-[10px] lg:hidden">
                        <div ref={strip} className="flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
                            {nav.map(n => (
                                <a key={n.id} href={`#${n.id}`} data-nav={n.id} onClick={e => goTo(e, n.id)} aria-current={active === n.id ? 'true' : undefined}
                                    className={cn('inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] font-bold no-underline transition-colors',
                                        active === n.id ? 'bg-[var(--site-paper)] text-[var(--site-on-paper)]' : 'border border-[var(--site-border-strong)] text-[var(--site-text)]')}>
                                    {n.label}
                                </a>
                            ))}
                        </div>
                    </nav>
                )}

                <div className={cn('mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:px-8 lg:py-10', canAdd && 'xl:grid-cols-[200px_minmax(0,1fr)_360px]')}>
                    <nav aria-label="Kategoriler" className="hidden lg:block">
                        <ul className="sticky top-[100px] m-0 flex max-h-[calc(100dvh-120px)] list-none flex-col gap-0.5 overflow-y-auto p-0">
                            {nav.map(n => (
                                <li key={n.id}>
                                    <a href={`#${n.id}`} onClick={e => goTo(e, n.id)} aria-current={active === n.id ? 'true' : undefined}
                                        className={cn('flex min-h-11 items-center rounded-xl px-3 text-[15px] no-underline transition-colors',
                                            active === n.id ? 'bg-[var(--site-paper)] font-bold text-[var(--site-on-paper)]' : 'font-semibold text-[var(--site-sub)] hover:bg-[var(--site-alt)] hover:text-[var(--site-text)]')}>
                                        {n.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="flex min-w-0 flex-col gap-8">
                        {!menuEmpty && (
                            <div className="flex flex-col gap-3">
                                <label className="flex h-[52px] items-center gap-3 rounded-full border border-[var(--site-border-strong)] bg-[var(--site-card)] px-5 focus-within:ring-2 focus-within:ring-[var(--site-focus)]">
                                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--site-muted)]"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                                    <span className="sr-only">Menüde ara</span>
                                    <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Yemek ya da içecek arayın"
                                        className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-[var(--site-text)] outline-none placeholder:text-[var(--site-muted)]" />
                                </label>
                                {chipsShown.length > 0 && (
                                    <div role="group" aria-label="Süzgeçler" className="flex flex-wrap gap-2">
                                        {chipsShown.map(c => (
                                            <button key={c.tag} type="button" aria-pressed={chip === c.tag} onClick={() => setChip(v => v === c.tag ? null : c.tag)}
                                                className={cn('inline-flex h-10 items-center rounded-full px-4 text-[14px] font-bold transition-colors',
                                                    chip === c.tag ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'border border-[var(--site-border-strong)] text-[var(--site-text)] hover:border-[var(--site-text)]')}>
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {menuEmpty ? (
                            <p className="m-0 py-16 text-center text-[18px] text-[var(--site-sub)]">Menü henüz hazırlanıyor.</p>
                        ) : nothing ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-center">
                                <p className={cn(serif, 'm-0 text-[30px] leading-tight')}>{query.trim() ? `“${query.trim()}” bulunamadı` : 'Bu süzgeçte ürün yok'}</p>
                                <p className="m-0 text-[var(--site-sub)]">Başka bir kelime deneyin ya da süzgeci kaldırın.</p>
                                <button type="button" onClick={() => { setQuery(''); setChip(null); }} className={spButton.outline}>Tüm menüyü göster</button>
                            </div>
                        ) : (
                            <>
                                {shownMenus.length > 0 && (
                                    <section id={SET_MENUS_ID} aria-labelledby={`${SET_MENUS_ID}-b`} className="flex scroll-mt-[140px] flex-col gap-4 lg:scroll-mt-[100px]">
                                        <span id="paket-menuler" aria-hidden="true" />
                                        <h2 id={`${SET_MENUS_ID}-b`} className={cn(serif, 'm-0 text-[30px] leading-tight')}>Hazır menüler</h2>
                                        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 min-[1700px]:grid-cols-3">
                                            {shownMenus.map(m => {
                                                const it = items.get(`s:${m.id}`) ?? setMenuItem(m);
                                                return (
                                                    <li key={m.id}>
                                                        <ItemCard item={it} restaurant={name} quantity={qty(it)} canAdd={canAdd && !it.soldOut}
                                                            onOpen={() => setOpenKey(it.key)} onAdd={() => quickAdd(it)} onRemove={() => quickRemove(it)} />
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </section>
                                )}
                                {groups.map(g => {
                                    const layout = categoryLayout(g.category.menuDisplay);
                                    const list = g.items.map(p => items.get(`p:${p.id}`)!).filter(Boolean);
                                    return (
                                        <section key={g.id} id={g.id} aria-labelledby={`${g.id}-b`} className="flex scroll-mt-[140px] flex-col gap-4 lg:scroll-mt-[100px]">
                                            <span id={`paket-${g.category.id}`} aria-hidden="true" className="block scroll-mt-[140px] lg:scroll-mt-[100px]" />
                                            <div className="flex items-baseline justify-between gap-3">
                                                <h2 id={`${g.id}-b`} className={cn(serif, 'm-0 text-[30px] leading-tight')}>{g.category.name}</h2>
                                                <span className="text-[14px] tabular-nums text-[var(--site-muted)]">{g.items.length} çeşit</span>
                                            </div>
                                            {layout === 'cards' ? (
                                                <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 min-[1700px]:grid-cols-3">
                                                    {list.map(it => (
                                                        <li key={it.key}>
                                                            <ItemCard item={it} restaurant={name} quantity={qty(it)} canAdd={canAdd && !it.soldOut}
                                                                onOpen={() => setOpenKey(it.key)} onAdd={() => quickAdd(it)} onRemove={() => quickRemove(it)} />
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className={cn(spCard, 'divide-y divide-[var(--site-border)] px-4 sm:px-5')}>
                                                    {list.map(it => (
                                                        <ItemRow key={it.key} item={it} quantity={qty(it)} canAdd={canAdd && !it.soldOut}
                                                            onOpen={() => setOpenKey(it.key)} onAdd={() => quickAdd(it)} onRemove={() => quickRemove(it)} />
                                                    ))}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </>
                        )}
                        <p className="sr-only" aria-live="polite">{announce}</p>
                    </div>

                    {canAdd && (
                        <aside aria-label="Sepetim" className="hidden xl:block">
                            <div className={cn(spCard, 'sticky top-[100px] flex max-h-[calc(100dvh-120px)] flex-col overflow-hidden')}>
                                <div className="flex items-center justify-between gap-3 border-b border-[var(--site-border)] px-5 py-4">
                                    <h2 ref={asideRef} tabIndex={-1} className={cn(serif, 'm-0 text-[24px] leading-none outline-none')}>Sepetim</h2>
                                    {count > 0 && <span className="rounded-full bg-[var(--site-alt)] px-2.5 py-1 text-[13px] font-bold tabular-nums">{count} ürün</span>}
                                </div>
                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">{cartBody}</div>
                                {cartFooter && <div className="border-t border-[var(--site-border)] px-5 py-4">{cartFooter}</div>}
                            </div>
                        </aside>
                    )}
                </div>
            </main>

            {showBar && !cartOpen && !checkoutOpen && !opened && (
                <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 xl:hidden">
                    <button type="button" onClick={() => setCartOpen(true)}
                        className="mx-auto flex min-h-[60px] w-full max-w-[640px] items-center gap-3 rounded-full bg-[var(--site-paper)] py-2 pl-5 pr-2 text-left text-[var(--site-on-paper)] shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--site-paper)_70%,transparent)]">
                        <BagGlyph className="h-5 w-5 shrink-0 text-[var(--site-mustard-text)]" />
                        <span className="min-w-0 flex-1 truncate text-[15px]"><b className="hidden min-[420px]:inline">Sepetim · </b>{count} ürün · <b className="tabular-nums">{formatSitePrice(summary.total)}</b></span>
                        <span className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--site-accent)] px-4 text-[14px] font-bold text-[var(--site-on-accent)]">Sepete git<ArrowGlyph className="h-4 w-4" /></span>
                    </button>
                </div>
            )}

            {cartOpen && (
                <SpModal title="Sepetim" onClose={() => setCartOpen(false)} footer={cartFooter}>
                    <div className="px-5 py-2">{cartBody}</div>
                </SpModal>
            )}
            {opened && draft && (
                <ItemDetail item={opened} restaurant={name} draft={draft} canAdd={canAdd} closedNote={closedNote}
                    onDraft={next => setDrafts(d => ({ ...d, [opened.key]: next }))} onAdd={addFromDetail} onClose={() => setOpenKey(null)} />
            )}
            {checkoutOpen && session.data && (
                <SophraCheckout session={session} summary={summary} onClose={() => setCheckoutOpen(false)} />
            )}
        </SitePage>
    );
}
