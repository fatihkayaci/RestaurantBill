import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Clock, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import type { OnlineMenuCategory, OnlineMenuProduct, OnlineSetMenu } from '@/features/delivery/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../components/StockImageLabel';
import { ImageSlot } from '../site/SiteChrome';
import { headingFont } from '../site/siteTheme';
import { scCard } from '../site/sicak/sicakParts';
import { MezeTray } from '../site/designs/meyhane/MezeTray';
import { MeyhaneCategoryHeader } from '../site/designs/meyhane/MeyhaneMenuParts';
import { isMezeCategory, meyhaneTabClass } from '../site/designs/meyhane/meyhaneParts';
import { BahceCategoryHeader, BahceItems } from '../site/designs/bahce/BahceMenuParts';
import { bahceTabClass } from '../site/designs/bahce/bahceParts';

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
    /** Sepetteki menüyü bir azaltır (son eklenen satır); verilmezse menü kartında − çizilmez. */
    onRemoveSetMenu?: (menu: OnlineSetMenu) => void;
    /** Yapışkan kategori şeridinin üstten boşluğu (sayfanın yapışkan başlığı varsa). */
    stickyTopClass?: string;
    /** true: öne çıkan ürünler ve menüler en üstte "Şefin önerileri" bölümünde de gösterilir (masa menüsü). */
    featuredSection?: boolean;
    /** true: yalnız göz atma; ekleme düğmeleri çizilmez (sipariş kapalı). */
    readOnly?: boolean;
    /** false dönen ürün/menü eklenemez, düğmesi çizilmez (ör. site menüsünde olup paket menüsünde olmayan). Varsayılan: hepsi. */
    canAddProduct?: (product: P) => boolean;
    canAddSetMenu?: (menu: OnlineSetMenu) => boolean;
    /** Menü boşken gösterilecek içerik (varsayılan: "Menü henüz hazırlanmadı"). */
    empty?: ReactNode;
    /** "sicak": Sıcak tasarımın kartları (üstten taşan yuvarlak tabak fotoğrafı, ortalı ad, küçük turuncu düğme).
     *  "meyhane" / "esnaf": ürünler satır satır (basılı menü kartı / pano; lineMenuVariant), menüler yine kart. Meyhane'de
     *  ayrıca ortalı basılı bölüm başlığı, yazı sekmeli kategori şeridi ve meze kategorilerinde tepsi (designs/meyhane).
     *  "bahce": tabak simgeli bölüm başlığı, yuvarlak çip şeridi, yuvarlak tabak fotoğraflı kartlar (designs/bahce). */
    variant?: 'default' | 'sicak' | 'meyhane' | 'esnaf' | 'bahce';
}

const SET_MENU_SECTION = 'menuler';
const FEATURED_SECTION = 'oneriler';
const noQuantity = () => 0;
const noop = () => {};
const always = () => true;
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
    onOpenSetMenu = noop, onRemoveSetMenu, stickyTopClass = 'top-0', featuredSection = false, readOnly = false, empty,
    canAddProduct = always, canAddSetMenu = always, variant = 'default',
}: Props<P>) {
    // Bütün hazır menüler (kategorisi olsun olmasın) tek "Menüler" bölümünde; kategoriler yalnız ürünleri gösterir.
    const featuredProducts = featuredSection ? categories.flatMap(c => c.products).filter(p => p.isFeatured && !p.isOutOfStock) : [];
    const featuredMenus = featuredSection ? setMenus.filter(m => m.isFeatured && m.isAvailable) : [];
    const sections = [
        ...(featuredProducts.length + featuredMenus.length > 0 ? [{ id: FEATURED_SECTION, name: 'Şefin önerileri', menus: featuredMenus, products: featuredProducts }] : []),
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
    const sicak = variant === 'sicak';
    const lines = variant === 'meyhane' || variant === 'esnaf';
    const meyhane = variant === 'meyhane';
    const bahce = variant === 'bahce';

    return (
        <div>
            {sections.length > 1 && (
                <nav aria-label="Menü kategorileri"
                    className={cn('sticky z-20 -mx-4 border-b backdrop-blur-[14px] md:-mx-6 lg:mx-0', stickyTopClass,
                        sicak ? 'border-[color-mix(in_srgb,var(--site-accent)_25%,transparent)] bg-[color-mix(in_srgb,#FFF6EC_88%,transparent)]' : 'border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-bg)_92%,transparent)]')}>
                    <div ref={stripRef} className="relative flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] md:px-6 lg:px-0 [&::-webkit-scrollbar]:hidden">
                        {sections.map(section => {
                            const selected = section.id === current;
                            return (
                                <a key={section.id} href={`#${sectionDomId(section.id)}`} data-section={section.id}
                                    onClick={e => goTo(e, section.id)}
                                    aria-current={selected ? 'true' : undefined}
                                    className={meyhane ? meyhaneTabClass(selected) : bahce ? bahceTabClass(selected) : cn(
                                        sicak
                                            ? 'flex h-10 shrink-0 items-center rounded-lg px-3.5 text-sm font-semibold no-underline transition-colors'
                                            : 'flex h-11 shrink-0 items-center rounded-full border px-4 text-[15px] font-semibold no-underline transition-colors',
                                        sicak
                                            ? (selected ? 'bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'text-[var(--site-sub)] hover:bg-[color-mix(in_srgb,var(--site-accent)_12%,transparent)] hover:text-[var(--site-text)]')
                                            : selected
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
                            {meyhane ? (
                                <MeyhaneCategoryHeader id={`${sectionDomId(section.id)}-baslik`} name={section.name} total={total}
                                    note={featured ? 'Birkaç lezzet bir arada, seçimi size kalsın.' : chefPicks ? 'Mutfağın bugün önerdikleri.' : undefined} />
                            ) : bahce ? (
                                <BahceCategoryHeader id={`${sectionDomId(section.id)}-baslik`} name={section.name} total={total}
                                    note={featured ? 'Birkaç lezzet bir arada, seçimi size kalsın.' : chefPicks ? 'Mutfağın bugün önerdikleri.' : undefined} />
                            ) : (
                                <>
                                    {/* rb-menu-cat: tasarıma özgü kategori başlığı (Esnaf'ta tabela şeridi; siteThemes.css). */}
                                    <div className="rb-menu-cat flex items-baseline justify-between gap-3">
                                        <h2 id={`${sectionDomId(section.id)}-baslik`} className={cn(headingFont, 'text-[24px] font-bold leading-tight md:text-[30px]')}>{section.name}</h2>
                                        <span className="shrink-0 text-sm font-medium text-[var(--site-sub)]">{total} çeşit</span>
                                    </div>
                                    {featured && <p className="mt-0.5 text-sm text-[var(--site-sub)]">Birkaç lezzet bir arada, seçimi size kalsın.</p>}
                                    {chefPicks && <p className="mt-0.5 text-sm text-[var(--site-sub)]">Mutfağın bugün önerdikleri.</p>}
                                </>
                            )}

                            {meyhane && !featured && !chefPicks && section.menus.length === 0 && isMezeCategory(section.name) ? (
                                // Meyhane: meze kategorisi tepside, küçük kâseler gibi.
                                <MezeTray className="mt-4" restaurant={restaurant} items={section.products.map(product => {
                                    const qty = productQuantity(product.id);
                                    return {
                                        id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, isStockImage: product.isStockImage,
                                        description: product.description, soldOut: product.isOutOfStock, featured: product.isFeatured, quantity: qty,
                                        readOnly: readOnly || (qty === 0 && !canAddProduct(product)),
                                        onAdd: () => onAddProduct(product), onRemove: () => onRemoveProduct(product),
                                    };
                                })} />
                            ) : bahce && !featured ? (
                                // Bahçe: yuvarlak tabak fotoğraflı kartlar; kategorisi olan menüler yine menü kartı.
                                <>
                                    {section.menus.length > 0 && (
                                        <ul className="mt-4 grid gap-3 md:grid-cols-2">
                                            {section.menus.map(menu => (
                                                <li key={menu.id}>
                                                    <SetMenuRow menu={menu} restaurant={restaurant} quantity={setMenuQuantity(menu.id)} readOnly={readOnly || !canAddSetMenu(menu)} onOpen={() => onOpenSetMenu(menu)}
                                                        onRemove={onRemoveSetMenu && !readOnly ? () => onRemoveSetMenu(menu) : undefined} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {section.products.length > 0 && (
                                        <BahceItems className="mt-4" restaurant={restaurant} items={section.products.map(product => {
                                            const qty = productQuantity(product.id);
                                            return {
                                                id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, isStockImage: product.isStockImage,
                                                description: product.description, soldOut: product.isOutOfStock, featured: product.isFeatured, prepMinutes: product.prepMinutes,
                                                quantity: qty, readOnly: readOnly || (qty === 0 && !canAddProduct(product)),
                                                onAdd: () => onAddProduct(product), onRemove: () => onRemoveProduct(product),
                                            };
                                        })} />
                                    )}
                                </>
                            ) : sicak ? (
                                <ul className="mt-4 grid list-none gap-x-4 gap-y-[72px] p-0 pt-14 sm:grid-cols-2 xl:grid-cols-3">
                                    {section.menus.map(menu => (
                                        <li key={menu.id}>
                                            <PlateCard
                                                name={menu.name} image={menu.imageUrl} stock={menu.isStockImage} restaurant={restaurant}
                                                description={menuContents(menu)} soldOut={!menu.isAvailable} featured={menu.isFeatured}
                                                kind="Menü" quantity={setMenuQuantity(menu.id)} readOnly={readOnly || !canAddSetMenu(menu)}
                                                price={<SetMenuPrice menu={menu} muted={!menu.isAvailable} className="justify-start" />}
                                                addLabel="Menüyü seç" onAdd={() => onOpenSetMenu(menu)}
                                                onRemove={onRemoveSetMenu ? () => onRemoveSetMenu(menu) : undefined}
                                                addMoreLabel={`${menu.name} bir tane daha seç`} />
                                        </li>
                                    ))}
                                    {section.products.map(product => {
                                        const qty = productQuantity(product.id);
                                        const prep = product.prepMinutes && product.prepMinutes > 0 ? product.prepMinutes : null;
                                        return (
                                            <li key={product.id}>
                                                <PlateCard
                                                    name={product.name} image={product.imageUrl} stock={product.isStockImage} restaurant={restaurant}
                                                    description={product.description?.trim() ?? ''} soldOut={product.isOutOfStock} featured={product.isFeatured}
                                                    prep={prep} quantity={qty} readOnly={readOnly || (qty === 0 && !canAddProduct(product))}
                                                    price={<Price value={product.price} muted={product.isOutOfStock} />}
                                                    addLabel="Sepete ekle" onAdd={() => onAddProduct(product)} onRemove={() => onRemoveProduct(product)} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : lines && !featured ? (
                                <>
                                    {section.menus.length > 0 && (
                                        <ul className="mt-4 grid gap-3 md:grid-cols-2">
                                            {section.menus.map(menu => (
                                                <li key={menu.id}>
                                                    <SetMenuRow menu={menu} restaurant={restaurant} quantity={setMenuQuantity(menu.id)} readOnly={readOnly || !canAddSetMenu(menu)} onOpen={() => onOpenSetMenu(menu)}
                                                        onRemove={onRemoveSetMenu && !readOnly ? () => onRemoveSetMenu(menu) : undefined} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {section.products.length > 0 && (
                                        <ul className={cn('m-0 mt-2 grid list-none p-0 md:grid-cols-2', variant === 'esnaf' ? 'md:gap-x-8' : 'md:gap-x-14')}>
                                            {section.products.map(product => (
                                                <li key={product.id}>
                                                    <LineRow tone={variant === 'esnaf' ? 'esnaf' : 'meyhane'} product={product} restaurant={restaurant} quantity={productQuantity(product.id)}
                                                        readOnly={readOnly || (productQuantity(product.id) === 0 && !canAddProduct(product))}
                                                        onAdd={() => onAddProduct(product)} onRemove={() => onRemoveProduct(product)} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            ) : featured ? (
                                <ul className="relative -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                                    {section.menus.map(menu => (
                                        <li key={menu.id} className={cn('shrink-0 snap-start md:w-auto', section.menus.length > 1 ? 'w-[84%]' : 'w-full')}>
                                            <FeaturedSetMenuCard menu={menu} restaurant={restaurant} quantity={setMenuQuantity(menu.id)} readOnly={readOnly || !canAddSetMenu(menu)} onOpen={() => onOpenSetMenu(menu)}
                                                onRemove={onRemoveSetMenu && !readOnly ? () => onRemoveSetMenu(menu) : undefined} />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                                    {section.menus.map(menu => (
                                        <li key={menu.id}>
                                            <SetMenuRow menu={menu} restaurant={restaurant} quantity={setMenuQuantity(menu.id)} readOnly={readOnly || !canAddSetMenu(menu)} onOpen={() => onOpenSetMenu(menu)}
                                                onRemove={onRemoveSetMenu && !readOnly ? () => onRemoveSetMenu(menu) : undefined} />
                                        </li>
                                    ))}
                                    {section.products.map(product => (
                                        <li key={product.id}>
                                            <ProductCard product={product} restaurant={restaurant} quantity={productQuantity(product.id)} readOnly={readOnly || (productQuantity(product.id) === 0 && !canAddProduct(product))}
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

/**
 * Sıcak tasarımın kartı (ürün ve menü): üstten taşan yuvarlak "tabak" fotoğrafı (koyu kenarlı), ortalı kalın ad, iki
 * satır açıklama; altta solda fiyat, sağda küçük köşeli turuncu düğme. Sepetteyse turuncu çerçeve ve −/+ adet.
 */
function PlateCard({ name, image, stock, restaurant, description, soldOut, featured, kind, prep, quantity, readOnly, price, addLabel, onAdd, onRemove, addMoreLabel }: {
    name: string; image: string; stock: boolean; restaurant: string; description: string; soldOut: boolean; featured: boolean;
    kind?: string; prep?: number | null; quantity: number; readOnly: boolean; price: ReactNode; addLabel: string;
    onAdd: () => void; onRemove?: () => void; addMoreLabel?: string;
}) {
    const inCart = quantity > 0;
    return (
        <article className={cn(scCard, 'relative flex h-full flex-col px-4 pb-4 pt-[78px] text-center transition-shadow',
            inCart ? 'border-[var(--site-accent)] shadow-[0_0_0_1px_var(--site-accent)]' : 'hover:shadow-[0_14px_30px_-18px_rgba(120,60,10,0.45)]')}>
            <div className="absolute -top-14 left-1/2 h-[124px] w-[124px] -translate-x-1/2 rounded-full bg-[#1E1915] p-[5px] shadow-[0_12px_24px_-10px_rgba(30,25,21,0.55)]"
                title={image && stock ? 'Temsili görsel' : undefined}>
                <ImageSlot src={image} alt={name} restaurant={restaurant} logoTextClassName="text-[min(13px,13cqw)]"
                    className={cn('h-full rounded-full', soldOut && 'opacity-60 grayscale')} />
                {image && stock && <span className="sr-only"> (temsili görsel)</span>}
            </div>
            {(kind || featured || inCart || soldOut) && (
                <span className="mb-1.5 flex flex-wrap items-center justify-center gap-1">
                    {soldOut ? <span className="rounded-md bg-[#1E1915] px-2 py-0.5 text-[11px] font-semibold text-[#FFF3E6]">Tükendi</span> : (
                        <>
                            {kind && <span className="rounded-md bg-[#FDE4CB] px-2 py-0.5 text-[11px] font-semibold text-[var(--site-accent-text)]">{kind}</span>}
                            {featured && <span className="rounded-md bg-[#FDE4CB] px-2 py-0.5 text-[11px] font-semibold text-[var(--site-accent-text)]"><span aria-hidden="true">★ </span>Ustanın seçimi</span>}
                            {inCart && <span className="rounded-md bg-[var(--site-accent)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--site-on-accent)]">Sepette {quantity}</span>}
                        </>
                    )}
                </span>
            )}
            <h3 className={cn(headingFont, 'text-base leading-snug', soldOut && 'text-[var(--site-sub)]')}>{name}</h3>
            {description && <p className="mx-auto mt-1 line-clamp-2 max-w-[30ch] text-[13px] leading-snug text-[var(--site-sub)]">{description}</p>}
            {prep && !soldOut && (
                <p className="mt-1 flex items-center justify-center gap-1 text-xs text-[var(--site-sub)]">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />~{prep} dk<span className="sr-only"> hazırlanma süresi</span>
                </p>
            )}
            <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-left">
                {price}
                {inCart && onRemove ? (
                    <div className="flex shrink-0 items-center rounded-lg bg-[var(--site-accent)] text-[var(--site-on-accent)]">
                        <button type="button" onClick={onRemove} aria-label={`${name} bir azalt`} className="flex h-10 w-9 items-center justify-center">
                            <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <span className="min-w-5 text-center text-sm font-bold tabular-nums" aria-live="polite">{quantity}</span>
                        <button type="button" onClick={onAdd} disabled={soldOut || readOnly} aria-label={addMoreLabel ?? `${name} bir artır`}
                            className="flex h-10 w-9 items-center justify-center disabled:opacity-40">
                            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                    </div>
                ) : soldOut ? <span className="text-[13px] font-semibold text-[var(--site-sub)]">Şu an yok</span> : readOnly ? null : (
                    <button type="button" onClick={onAdd} aria-label={`${name}: ${addLabel.toLowerCase()}`}
                        className="flex h-10 shrink-0 items-center rounded-lg bg-[var(--site-accent)] px-3.5 text-[13px] font-semibold text-[var(--site-on-accent)] transition-[transform,opacity] hover:opacity-90 active:scale-95">
                        {addLabel}
                    </button>
                )}
            </div>
        </article>
    );
}

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

/** Sepetteki ürün/menünün −/+ adet düğmesi. Menüde + seçim penceresini açar (etiketi `addLabel`). */
function QuantityStepper({ name, quantity, onRemove, onAdd, addDisabled, addLabel }: {
    name: string; quantity: number; onRemove: () => void; onAdd: () => void; addDisabled?: boolean; addLabel?: string;
}) {
    return (
        <div className="flex shrink-0 items-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]">
            <button type="button" onClick={onRemove} aria-label={`${name} bir azalt`}
                className="flex h-11 w-10 items-center justify-center rounded-full">
                <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="min-w-5 text-center text-base font-bold tabular-nums" aria-live="polite">{quantity}</span>
            <button type="button" onClick={onAdd} disabled={addDisabled} aria-label={addLabel ?? `${name} bir artır`}
                className="flex h-11 w-10 items-center justify-center rounded-full disabled:opacity-40">
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
        </div>
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
                        <QuantityStepper name={product.name} quantity={quantity} onRemove={onRemove} onAdd={onAdd} addDisabled={soldOut} />
                    )}
                </div>
            </div>
            <Thumb src={product.imageUrl} alt={product.name} restaurant={restaurant} soldOut={soldOut} stock={product.isStockImage} />
        </article>
    );
}

/**
 * Satır menüsünün ürünü (Meyhane Gecesi ve Esnaf Tabelası). Fotoğraf yalnız varsa çizilir; yoksa satır yine dolu görünür.
 * - meyhane: basılı meyhane menüsü gibi; serif ad, noktalı çizgiyle bağlı vurgu renginde fiyat, altında soluk açıklama,
 *   fotoğraf varsa solda yuvarlak; ekleme düğmesi ince vurgu çizgili daire.
 * - esnaf: lokanta panosu gibi; dar kalın büyük harf ad, sağa dayalı büyük fiyat, satırlar arası kalın çizgi, fotoğraf
 *   varsa solda köşeli kare; ekleme düğmesi koyu dolu kare.
 */
function LineRow({ tone, product, restaurant, quantity, readOnly, onAdd, onRemove }: {
    tone: 'meyhane' | 'esnaf'; product: MenuCardProduct; restaurant: string; quantity: number; readOnly: boolean;
    onAdd: () => void; onRemove: () => void;
}) {
    const soldOut = product.isOutOfStock;
    const description = product.description?.trim();
    const prep = product.prepMinutes && product.prepMinutes > 0 ? product.prepMinutes : null;
    const esnaf = tone === 'esnaf';
    const meta = quantity > 0 || (product.isFeatured && !soldOut) || soldOut || prep;
    return (
        <article className={cn('flex h-full items-start gap-3.5 py-4',
            esnaf ? 'border-b-2 border-[var(--site-border-strong)]' : 'border-b border-[var(--site-line)]')}>
            {product.imageUrl && (
                <div className={cn('relative shrink-0', esnaf ? 'h-[72px] w-[72px]' : 'h-16 w-16')}>
                    <ImageSlot src={product.imageUrl} alt={product.name} restaurant={restaurant} logoTextClassName="text-[min(11px,13cqw)]"
                        className={cn('h-full', esnaf ? 'rounded-md' : 'rounded-full', soldOut && 'opacity-60 grayscale')} />
                    {product.isStockImage && <span className="sr-only"> (temsili görsel)</span>}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                    <h3 className={cn(headingFont, 'min-w-0 leading-tight', esnaf ? 'text-[21px] md:text-[23px]' : 'text-[19px] md:text-[21px]', soldOut && 'text-[var(--site-sub)]')}>
                        {product.name}
                    </h3>
                    <span aria-hidden="true" className={cn('min-w-6 flex-1', esnaf ? '' : '-translate-y-[5px] border-b-2 border-dotted border-[var(--site-border-strong)]')} />
                    <span className={cn(headingFont, 'shrink-0 whitespace-nowrap tabular-nums',
                        esnaf ? 'text-[24px] leading-none md:text-[26px]' : 'text-[19px] md:text-[21px]',
                        soldOut ? 'text-[var(--site-sub)] line-through decoration-1' : 'text-[var(--site-accent-text)]')}>
                        {formatPrice(product.price)} ₺
                    </span>
                </div>
                {description && <p className="m-0 mt-1 line-clamp-2 text-sm leading-snug text-[var(--site-sub)]">{description}</p>}
                {meta && (
                    <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-[var(--site-sub)]">
                        {soldOut && <span className="font-bold text-[var(--site-text)]">Bugünlük tükendi</span>}
                        {quantity > 0 && <InCartBadge quantity={quantity} />}
                        {product.isFeatured && !soldOut && <span className="font-bold text-[var(--site-accent-text)]"><span aria-hidden="true">★ </span>Ustanın seçimi</span>}
                        {prep && !soldOut && (
                            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />~{prep} dk<span className="sr-only"> hazırlanma süresi</span></span>
                        )}
                    </p>
                )}
            </div>
            {!readOnly && !(soldOut && quantity === 0) && (
                <div className="shrink-0 self-center">
                    {quantity > 0 ? (
                        <QuantityStepper name={product.name} quantity={quantity} onRemove={onRemove} onAdd={onAdd} addDisabled={soldOut} />
                    ) : (
                        <button type="button" onClick={onAdd} aria-label={`${product.name} sepete ekle`}
                            className={cn('flex h-11 w-11 items-center justify-center transition-colors',
                                esnaf ? 'rounded-md bg-[var(--site-paper)] text-[var(--site-on-paper)] hover:opacity-90'
                                    : 'rounded-full border border-[var(--site-accent-line)] text-[var(--site-accent-text)] hover:bg-[var(--site-accent)] hover:text-[var(--site-on-accent)]')}>
                            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}
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
function SetMenuRow({ menu, restaurant, quantity, readOnly, onOpen, onRemove }: { menu: OnlineSetMenu; restaurant: string; quantity: number; readOnly: boolean; onOpen: () => void; onRemove?: () => void }) {
    const soldOut = !menu.isAvailable;
    return (
        <article className={cardClass(quantity > 0, soldOut)}>
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="mb-1 flex items-center gap-1.5">
                    <span className="rounded-full bg-[var(--site-raised)] px-2 py-0.5 text-[11px] font-bold text-[var(--site-text)]">Menü</span>
                    {menu.isFeatured && !soldOut && (
                        <span className="rounded-full bg-[var(--site-raised)] px-2 py-0.5 text-[11px] font-bold text-[var(--site-text)]">Ustanın seçimi</span>
                    )}
                    {quantity > 0 && <InCartBadge quantity={quantity} />}
                </span>
                <h3 className={cn('text-base font-bold leading-snug', soldOut && 'text-[var(--site-sub)]')}>{menu.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[var(--site-sub)]">{menuContents(menu)}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
                    <SetMenuPrice menu={menu} muted={soldOut} />
                    {quantity > 0 && onRemove ? <QuantityStepper name={menu.name} quantity={quantity} onRemove={onRemove} onAdd={onOpen} addDisabled={soldOut || readOnly} addLabel={`${menu.name} bir tane daha seç`} /> : soldOut ? <span className="text-sm font-semibold text-[var(--site-sub)]">Şu an yok</span> : readOnly ? null : (
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
function FeaturedSetMenuCard({ menu, restaurant, quantity, readOnly, onOpen, onRemove }: { menu: OnlineSetMenu; restaurant: string; quantity: number; readOnly: boolean; onOpen: () => void; onRemove?: () => void }) {
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
                    {menu.isFeatured && !soldOut && (
                        <span className="rounded-full bg-[var(--site-card)] px-2.5 py-1 text-xs font-bold text-[var(--site-text)]">Ustanın seçimi</span>
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
                {quantity > 0 && onRemove ? <QuantityStepper name={menu.name} quantity={quantity} onRemove={onRemove} onAdd={onOpen} addDisabled={soldOut || readOnly} addLabel={`${menu.name} bir tane daha seç`} /> : soldOut ? <span className="text-sm font-semibold text-[var(--site-sub)]">Şu an yok</span> : readOnly ? null : (
                    <button type="button" onClick={onOpen} aria-label={`${menu.name} seç`}
                        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--site-accent)] px-5 text-sm font-semibold text-[var(--site-on-accent)] transition-opacity hover:opacity-90">
                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />Menüyü seç
                    </button>
                )}
            </div>
        </article>
    );
}
