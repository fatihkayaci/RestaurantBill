import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Clock, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import type { OnlineMenuCategory, OnlineMenuProduct, OnlineSetMenu } from '@/features/delivery/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../components/StockImageLabel';
import { ImageSlot } from '../site/SiteChrome';
import { headingFont } from '../site/siteTheme';

/** Kartın ürünü: paket menüsünün ürünü; masa menüsü hazırlanma süresini de verir. */
export type MenuCardProduct = OnlineMenuProduct & { prepMinutes?: number | null };

interface Props<P extends MenuCardProduct> {
    categories: (Omit<OnlineMenuCategory, 'products'> & { products: P[] })[];
    /** Paket menüler (set); `readOnly` iken "Seç" düğmesi çizilmez. */
    setMenus?: OnlineSetMenu[];
    /** Görseli olmayan ürünün yer tutucusunda restoranın yazı logosu çizilir. */
    restaurant: string;
    productQuantity: (productId: string) => number;
    setMenuQuantity?: (setMenuId: string) => number;
    onAddProduct: (product: P) => void;
    onRemoveProduct: (product: P) => void;
    onOpenSetMenu?: (menu: OnlineSetMenu) => void;
    /** Yapışkan kategori şeridinin üstten boşluğu (sayfanın yapışkan başlığı varsa). */
    stickyTopClass?: string;
    /** true: öne çıkan ürünler en üstte "Şefin önerileri" bölümünde de gösterilir (masa menüsü). */
    featuredSection?: boolean;
    /** true: yalnız göz atma; ekleme düğmeleri çizilmez (sipariş kapalı). */
    readOnly?: boolean;
    /** Menü boşken gösterilecek içerik (varsayılan: "Menü henüz hazırlanmadı"). */
    empty?: ReactNode;
}

const SET_MENU_SECTION = 'menuler';
const FEATURED_SECTION = 'oneriler';
const noQuantity = () => 0;
const noop = () => {};
const sectionDomId = (id: string) => `paket-${id}`;

/** "Adana + İçecek seçimi + Patates": tek seçenekli bölüm ürün adıyla, seçimli bölüm "<bölüm> seçimi" olarak yazılır. */
function menuContents(menu: OnlineSetMenu): string {
    return menu.slots
        .map(slot => (slot.isFixed || slot.options.length === 1)
            ? (slot.options[0]?.productName ?? slot.name)
            : `${slot.name} seçimi`)
        .join(' + ');
}

// Paket sipariş menüsü: yapışkan kategori şeridi (kaydırdıkça bulunulan bölüm işaretlenir), fotoğraflı ürün kartları ve
// +/− adet. "Tükendi" ürünler soluk ve eklenemez; menüler (set) seçim penceresiyle eklenir. Bütün menüler en
// üstte "Menüler" bölümünde büyük kartlarla durur (kategorisi olsa da).
// Masa menüsü (TableOrderPage) de aynı kartları kullanır: `featuredSection` en üste "Şefin önerileri"ni ekler, `readOnly`
// eklemesiz göz atmadır; ürünün hazırlanma süresi (prepMinutes) varsa kartta görünür.
export default function DeliveryMenu<P extends MenuCardProduct>({
    categories, setMenus = [], restaurant, productQuantity, setMenuQuantity = noQuantity, onAddProduct, onRemoveProduct,
    onOpenSetMenu = noop, stickyTopClass = 'top-0', featuredSection = false, readOnly = false, empty,
}: Props<P>) {
    // Bütün hazır menüler (kategorisi olsun olmasın) tek "Menüler" bölümünde; kategoriler yalnız ürünleri gösterir.
    const featuredProducts = featuredSection ? categories.flatMap(c => c.products).filter(p => p.isFeatured && !p.isOutOfStock) : [];
    const sections = [
        ...(featuredProducts.length > 0 ? [{ id: FEATURED_SECTION, name: 'Şefin önerileri', menus: [] as OnlineSetMenu[], products: featuredProducts }] : []),
        ...(setMenus.length > 0 ? [{ id: SET_MENU_SECTION, name: 'Menüler', menus: setMenus, products: [] as P[] }] : []),
        ...categories.map(c => ({ id: c.id, name: c.name, menus: [] as OnlineSetMenu[], products: c.products })),
    ].filter(s => s.menus.length + s.products.length > 0);

    const sectionKey = sections.map(s => s.id).join('|');
    const [active, setActive] = useState<string | null>(null);
    const stripRef = useRef<HTMLDivElement>(null);

    // Bulunulan bölüm: ekranın üst kısmına (şeridin hemen altı) giren son bölüm.
    useEffect(() => {
        const ids = sectionKey ? sectionKey.split('|') : [];
        const elements = ids.map(id => document.getElementById(sectionDomId(id))).filter((el): el is HTMLElement => !!el);
        if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return;
        const visible = new Set<string>();
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const id = entry.target.id.slice('paket-'.length);
                if (entry.isIntersecting) visible.add(id); else visible.delete(id);
            }
            const first = ids.find(id => visible.has(id));
            if (first) setActive(first);
        }, { rootMargin: '-96px 0px -55% 0px' });
        elements.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [sectionKey]);

    // İşaretli çip şeritte görünür kalsın (yalnızca yatay kaydırma; sayfa kaymaz).
    useEffect(() => {
        const strip = stripRef.current;
        const chip = active ? strip?.querySelector<HTMLElement>(`[data-section="${active}"]`) : null;
        if (!strip || !chip) return;
        strip.scrollTo({ left: chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
    }, [active]);

    if (sections.length === 0) {
        if (empty) return <>{empty}</>;
        return (
            <div className="flex flex-col items-center px-4 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--site-raised)] text-[var(--site-sub)]">
                    <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className={cn(headingFont, 'mt-4 text-xl font-bold')}>Menü henüz hazırlanmadı</p>
                <p className="mt-1 max-w-xs text-sm text-[var(--site-sub)]">Restoran ürünlerini eklediğinde burada görünecek.</p>
            </div>
        );
    }

    const goTo = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
        const target = document.getElementById(sectionDomId(id));
        if (!target) return;
        e.preventDefault();
        setActive(id);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const current = active ?? sections[0].id;

    return (
        <div>
            {sections.length > 1 && (
                <nav aria-label="Menü kategorileri"
                    className={cn('sticky z-20 -mx-4 border-b border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-bg)_92%,transparent)] backdrop-blur-[14px] md:-mx-6 lg:mx-0', stickyTopClass)}>
                    <div ref={stripRef} className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] md:px-6 lg:px-0 [&::-webkit-scrollbar]:hidden">
                        {sections.map(section => {
                            const selected = section.id === current;
                            return (
                                <a key={section.id} href={`#${sectionDomId(section.id)}`} data-section={section.id}
                                    onClick={e => goTo(e, section.id)}
                                    aria-current={selected ? 'true' : undefined}
                                    className={cn(
                                        'flex h-11 shrink-0 items-center rounded-full border px-4 text-[15px] font-semibold no-underline transition-colors',
                                        selected
                                            ? 'border-[var(--site-paper)] bg-[var(--site-paper)] text-[var(--site-on-paper)]'
                                            : 'border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-text)]',
                                    )}>
                                    {section.name}
                                </a>
                            );
                        })}
                    </div>
                </nav>
            )}

            <div className="flex flex-col gap-10 pb-6 pt-6 md:pt-8">
                {sections.map(section => {
                    const featured = section.id === SET_MENU_SECTION;
                    const chefPicks = section.id === FEATURED_SECTION;
                    const total = section.menus.length + section.products.length;
                    return (
                        <section key={section.id} id={sectionDomId(section.id)} aria-labelledby={`${sectionDomId(section.id)}-baslik`} className="scroll-mt-20">
                            <div className="flex items-baseline justify-between gap-3">
                                <h2 id={`${sectionDomId(section.id)}-baslik`} className={cn(headingFont, 'text-[24px] font-bold leading-tight md:text-[30px]')}>{section.name}</h2>
                                <span className="shrink-0 text-sm font-medium text-[var(--site-sub)]">{total} çeşit</span>
                            </div>
                            {featured && <p className="mt-0.5 text-sm text-[var(--site-sub)]">Birkaç lezzet bir arada, seçimi size kalsın.</p>}
                            {chefPicks && <p className="mt-0.5 text-sm text-[var(--site-sub)]">Mutfağın bugün önerdikleri.</p>}

                            {featured ? (
                                <ul className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                                    {section.menus.map(menu => (
                                        <li key={menu.id} className={cn('shrink-0 snap-start md:w-auto', section.menus.length > 1 ? 'w-[84%]' : 'w-full')}>
                                            <FeaturedSetMenuCard menu={menu} restaurant={restaurant} quantity={setMenuQuantity(menu.id)} readOnly={readOnly} onOpen={() => onOpenSetMenu(menu)} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                                    {section.menus.map(menu => (
                                        <li key={menu.id}>
                                            <SetMenuRow menu={menu} restaurant={restaurant} quantity={setMenuQuantity(menu.id)} readOnly={readOnly} onOpen={() => onOpenSetMenu(menu)} />
                                        </li>
                                    ))}
                                    {section.products.map(product => (
                                        <li key={product.id}>
                                            <ProductCard product={product} restaurant={restaurant} quantity={productQuantity(product.id)} readOnly={readOnly}
                                                onAdd={() => onAddProduct(product)} onRemove={() => onRemoveProduct(product)} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

// ── Kartlar ──────────────────────────────────────────────────────────────────────────────────────

function cardClass(inCart: boolean, soldOut: boolean) {
    return cn(
        'flex h-full gap-3 rounded-[22px] border bg-[var(--site-card)] p-3 transition-colors',
        inCart ? 'border-[var(--site-accent)] shadow-[0_0_0_1px_var(--site-accent)]' : 'border-[var(--site-border)]',
        !inCart && !soldOut && 'hover:border-[var(--site-border-strong)]',
    );
}

function Thumb({ src, alt, restaurant, soldOut, stock }: { src: string; alt: string; restaurant: string; soldOut: boolean; stock: boolean }) {
    return (
        <div className="relative h-[104px] w-[104px] shrink-0 md:h-28 md:w-28">
            <ImageSlot src={src} alt={alt} restaurant={restaurant} logoTextClassName="text-[min(15px,13cqw)]"
                className={cn('h-full rounded-2xl', soldOut && 'opacity-60 grayscale')} />
            {soldOut && <SoldOutBadge className="absolute left-1.5 top-1.5" />}
            {stock && src && <StockImageLabel />}
        </div>
    );
}

function SoldOutBadge({ className }: { className?: string }) {
    return (
        <span className={cn('rounded-full bg-[var(--site-paper)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--site-on-paper)]', className)}>
            Tükendi
        </span>
    );
}

function Price({ value, muted }: { value: number; muted?: boolean }) {
    return <span className={cn('whitespace-nowrap text-[17px] font-extrabold tabular-nums', muted && 'text-[var(--site-sub)]')}>{formatPrice(value)} ₺</span>;
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-label={label}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)] transition-transform hover:scale-105 active:scale-95">
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        </button>
    );
}

function ProductCard({ product, restaurant, quantity, readOnly, onAdd, onRemove }: {
    product: MenuCardProduct; restaurant: string; quantity: number; readOnly: boolean; onAdd: () => void; onRemove: () => void;
}) {
    const soldOut = product.isOutOfStock;
    const description = product.description?.trim();
    const prep = product.prepMinutes && product.prepMinutes > 0 ? product.prepMinutes : null;
    const badges = quantity > 0 || (product.isFeatured && !soldOut);
    return (
        <article className={cardClass(quantity > 0, soldOut)}>
            <div className="flex min-w-0 flex-1 flex-col">
                {badges && (
                    <span className="mb-1 flex flex-wrap items-center gap-1.5">
                        {quantity > 0 && <InCartBadge quantity={quantity} />}
                        {product.isFeatured && !soldOut && (
                            <span className="rounded-full bg-[var(--site-raised)] px-2 py-0.5 text-[11px] font-bold text-[var(--site-text)]">Ustanın seçimi</span>
                        )}
                    </span>
                )}
                <h3 className={cn('text-base font-bold leading-snug', soldOut && 'text-[var(--site-sub)]')}>{product.name}</h3>
                {description && <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[var(--site-sub)]">{description}</p>}
                {soldOut ? (
                    <p className="mt-0.5 text-sm font-medium text-[var(--site-sub)]">Bugünlük tükendi</p>
                ) : prep ? (
                    <p className="mt-1 flex items-center gap-1 text-[13px] text-[var(--site-sub)]">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />~{prep} dk<span className="sr-only"> hazırlanma süresi</span>
                    </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                    <Price value={product.price} muted={soldOut} />
                    {readOnly ? null : soldOut && quantity === 0 ? (
                        <span className="text-sm font-semibold text-[var(--site-sub)]">Şu an yok</span>
                    ) : quantity === 0 ? (
                        <AddButton label={`${product.name} sepete ekle`} onClick={onAdd} />
                    ) : (
                        <div className="flex shrink-0 items-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]">
                            <button type="button" onClick={onRemove} aria-label={`${product.name} bir azalt`}
                                className="flex h-11 w-10 items-center justify-center rounded-full">
                                <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                            </button>
                            <span className="min-w-5 text-center text-base font-bold tabular-nums" aria-live="polite">{quantity}</span>
                            <button type="button" onClick={onAdd} disabled={soldOut} aria-label={`${product.name} bir artır`}
                                className="flex h-11 w-10 items-center justify-center rounded-full disabled:opacity-40">
                                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <Thumb src={product.imageUrl} alt={product.name} restaurant={restaurant} soldOut={soldOut} stock={product.isStockImage} />
        </article>
    );
}

/**
 * Menünün fiyatı; indirimliyse yanında üstü çizili normal fiyat (temel ürünlerin tek tek fiyatı) ve "%N avantajlı" rozeti
 * (yüzde aşağı yuvarlanır). İndirim yoksa regularPrice fiyatla aynıdır, ek bir şey gösterilmez.
 */
export function SetMenuPrice({ menu, muted, className }: { menu: OnlineSetMenu; muted?: boolean; className?: string }) {
    const regular = menu.regularPrice ?? menu.price;
    const discounted = regular > menu.price && regular > 0;
    const percent = discounted ? Math.floor(((regular - menu.price) / regular) * 100) : 0;
    return (
        <span className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5', className)}>
            <Price value={menu.price} muted={muted} />
            {discounted && (
                <>
                    <s className="whitespace-nowrap text-sm font-medium tabular-nums text-[var(--site-sub)]">
                        <span className="sr-only">Normal fiyatı </span>{formatPrice(regular)} ₺
                    </s>
                    {percent > 0 && (
                        <span className="whitespace-nowrap rounded-full bg-[var(--site-ok-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--site-ok)]">%{percent} avantajlı</span>
                    )}
                </>
            )}
        </span>
    );
}

function InCartBadge({ quantity }: { quantity: number }) {
    return <span className="rounded-full bg-[var(--site-accent)] px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--site-on-accent)]">Sepette {quantity}</span>;
}

/** Kategorisi olan menü: ürün kartıyla aynı yatay kart, açıklama yerine içerik özeti. */
function SetMenuRow({ menu, restaurant, quantity, readOnly, onOpen }: { menu: OnlineSetMenu; restaurant: string; quantity: number; readOnly: boolean; onOpen: () => void }) {
    const soldOut = !menu.isAvailable;
    return (
        <article className={cardClass(quantity > 0, soldOut)}>
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="mb-1 flex items-center gap-1.5">
                    <span className="rounded-full bg-[var(--site-raised)] px-2 py-0.5 text-[11px] font-bold text-[var(--site-text)]">Menü</span>
                    {quantity > 0 && <InCartBadge quantity={quantity} />}
                </span>
                <h3 className={cn('text-base font-bold leading-snug', soldOut && 'text-[var(--site-sub)]')}>{menu.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[var(--site-sub)]">{menuContents(menu)}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                    <SetMenuPrice menu={menu} muted={soldOut} />
                    {soldOut ? <span className="text-sm font-semibold text-[var(--site-sub)]">Şu an yok</span> : readOnly ? null : (
                        <button type="button" onClick={onOpen} aria-label={`${menu.name} seç`}
                            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--site-paper)] px-4 text-sm font-semibold text-[var(--site-on-paper)] transition-opacity hover:opacity-90">
                            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />Seç
                        </button>
                    )}
                </div>
            </div>
            <Thumb src={menu.imageUrl} alt={menu.name} restaurant={restaurant} soldOut={soldOut} stock={menu.isStockImage} />
        </article>
    );
}

/** Öne çıkan "Menüler" bölümünün büyük kartı: üstte geniş görsel, altında içerik özeti ve "Seç". */
function FeaturedSetMenuCard({ menu, restaurant, quantity, readOnly, onOpen }: { menu: OnlineSetMenu; restaurant: string; quantity: number; readOnly: boolean; onOpen: () => void }) {
    const soldOut = !menu.isAvailable;
    const description = menu.description?.trim();
    return (
        <article className={cn(cardClass(quantity > 0, soldOut), 'flex-col gap-3 p-2.5')}>
            <div className="relative">
                <ImageSlot src={menu.imageUrl} alt={menu.name} restaurant={restaurant}
                    className={cn('aspect-[16/9] rounded-2xl', soldOut && 'opacity-60 grayscale')} />
                {menu.isStockImage && menu.imageUrl && <StockImageLabel className="bottom-2.5 right-2.5" />}
                <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    {soldOut ? <SoldOutBadge /> : (
                        <span className="rounded-full bg-[var(--site-mustard)] px-2.5 py-1 text-xs font-extrabold text-[#24180F]">Menü</span>
                    )}
                    {quantity > 0 && <InCartBadge quantity={quantity} />}
                </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col px-1.5">
                <h3 className={cn(headingFont, 'text-xl font-bold leading-tight', soldOut && 'text-[var(--site-sub)]')}>{menu.name}</h3>
                <p className="mt-1 text-sm font-medium leading-snug text-[var(--site-text)]">{menuContents(menu)}</p>
                {description && <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--site-sub)]">{description}</p>}
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 px-1.5 pb-1">
                <SetMenuPrice menu={menu} muted={soldOut} />
                {soldOut ? <span className="text-sm font-semibold text-[var(--site-sub)]">Şu an yok</span> : readOnly ? null : (
                    <button type="button" onClick={onOpen} aria-label={`${menu.name} seç`}
                        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--site-accent)] px-5 text-sm font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90">
                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />Menüyü seç
                    </button>
                )}
            </div>
        </article>
    );
}
