import { Minus, Plus } from 'lucide-react';
import type { OnlineMenuCategory, OnlineMenuProduct, OnlineSetMenu } from '@/features/delivery/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { headingFont } from '../site/siteTheme';

interface Props {
    categories: OnlineMenuCategory[];
    setMenus: OnlineSetMenu[];
    productQuantity: (productId: string) => number;
    setMenuQuantity: (setMenuId: string) => number;
    onAddProduct: (product: OnlineMenuProduct) => void;
    onRemoveProduct: (product: OnlineMenuProduct) => void;
    onOpenSetMenu: (menu: OnlineSetMenu) => void;
    /** Yapışkan kategori şeridinin üstten boşluğu (sayfanın yapışkan başlığı varsa). */
    stickyTopClass?: string;
}

const SET_MENU_SECTION = 'menuler';

// Paket sipariş menüsü. QR menüsünün (MenuBrowser) görünümü: üstte kategori çipleri, altında satırlar ve sağda +/−.
// Ondan farkı: "Tükendi" ürünler soluk ve eklenemez; menüler (set) seçim penceresiyle eklenir. Menüler kendi gösterim
// kategorisinin başında, kategorisi yoksa en üstte "Menüler" bölümünde durur.
export default function DeliveryMenu({
    categories, setMenus, productQuantity, setMenuQuantity, onAddProduct, onRemoveProduct, onOpenSetMenu, stickyTopClass = 'top-0',
}: Props) {
    const categoryIds = new Set(categories.map(c => c.id));
    const looseMenus = setMenus.filter(m => !m.categoryId || !categoryIds.has(m.categoryId));
    const sections = [
        ...(looseMenus.length > 0 ? [{ id: SET_MENU_SECTION, name: 'Menüler', menus: looseMenus, products: [] as OnlineMenuProduct[] }] : []),
        ...categories.map(c => ({ id: c.id, name: c.name, menus: setMenus.filter(m => m.categoryId === c.id), products: c.products })),
    ].filter(s => s.menus.length + s.products.length > 0);

    if (sections.length === 0) {
        return <p className="px-4 py-12 text-center text-base text-[var(--site-sub)]">Menü henüz hazırlanmadı.</p>;
    }

    return (
        <div>
            <nav aria-label="Menü kategorileri"
                className={cn('sticky z-10 flex gap-2 overflow-x-auto bg-[var(--site-bg)]/95 px-4 py-2.5 backdrop-blur-sm md:flex-wrap md:px-6', stickyTopClass)}>
                {sections.map(section => (
                    <a key={section.id} href={`#paket-${section.id}`}
                        className="flex h-11 shrink-0 items-center rounded-full border border-[var(--site-border-strong)] px-5 text-[15px] font-semibold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-accent)] hover:text-[var(--site-accent)]">
                        {section.name}
                    </a>
                ))}
            </nav>

            <div className="flex flex-col gap-10 px-4 pb-6 pt-6 md:px-6 md:pt-8">
                {sections.map(section => (
                    <section key={section.id} id={`paket-${section.id}`} className="scroll-mt-32">
                        <h3 className={cn(headingFont, 'text-[22px] font-bold leading-tight md:text-[28px]')}>{section.name}</h3>
                        <ul className="mt-1">
                            {section.menus.map(menu => (
                                <SetMenuRow key={menu.id} menu={menu} quantity={setMenuQuantity(menu.id)} onOpen={() => onOpenSetMenu(menu)} />
                            ))}
                            {section.products.map(product => (
                                <ProductRow key={product.id} product={product} quantity={productQuantity(product.id)}
                                    onAdd={() => onAddProduct(product)} onRemove={() => onRemoveProduct(product)} />
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
}

function Thumb({ src }: { src: string }) {
    return src ? <img src={src} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-[14px] object-cover" /> : null;
}

function SoldOut() {
    return <span className="shrink-0 rounded-full bg-[var(--site-raised)] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[var(--site-sub)]">Tükendi</span>;
}

function ProductRow({ product, quantity, onAdd, onRemove }: {
    product: OnlineMenuProduct; quantity: number; onAdd: () => void; onRemove: () => void;
}) {
    const soldOut = product.isOutOfStock;
    return (
        <li className={cn('flex items-center gap-3.5 border-b border-[var(--site-border)] py-3.5', soldOut && 'opacity-55')}>
            <Thumb src={product.imageUrl} />
            <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-snug">{product.name}</p>
                {product.description?.trim() && <p className="line-clamp-2 text-sm text-[var(--site-sub)]">{product.description}</p>}
                <p className={cn(headingFont, 'text-base font-bold tabular-nums text-[var(--site-sub)]')}>{formatPrice(product.price)} ₺</p>
            </div>
            {soldOut && quantity === 0 ? <SoldOut /> : quantity === 0 ? (
                <button type="button" onClick={onAdd} aria-label={`${product.name} sepete ekle`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-border-strong)] text-[var(--site-text)] transition-colors hover:border-[var(--site-accent)]">
                    <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                </button>
            ) : (
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-raised)] p-0.5">
                    <button type="button" onClick={onRemove} aria-label={`${product.name} bir azalt`}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-text)]">
                        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                    <span className="min-w-5 text-center text-base font-bold" aria-live="polite">{quantity}</span>
                    <button type="button" onClick={onAdd} disabled={soldOut} aria-label={`${product.name} bir artır`}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)] disabled:opacity-40">
                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                </div>
            )}
        </li>
    );
}

function SetMenuRow({ menu, quantity, onOpen }: { menu: OnlineSetMenu; quantity: number; onOpen: () => void }) {
    const soldOut = !menu.isAvailable;
    const contents = menu.slots.map(s => s.name).join(' + ');
    return (
        <li className={cn('flex items-center gap-3.5 border-b border-[var(--site-border)] py-3.5', soldOut && 'opacity-55')}>
            <Thumb src={menu.imageUrl} />
            <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-snug">{menu.name}</p>
                <p className="line-clamp-2 text-sm text-[var(--site-sub)]">{menu.description?.trim() || contents}</p>
                <p className={cn(headingFont, 'text-base font-bold tabular-nums text-[var(--site-sub)]')}>{formatPrice(menu.price)} ₺</p>
            </div>
            {soldOut ? <SoldOut /> : (
                <button type="button" onClick={onOpen} aria-label={`${menu.name} seç`}
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-[var(--site-border-strong)] px-4 text-sm font-semibold text-[var(--site-text)] transition-colors hover:border-[var(--site-accent)]">
                    {quantity > 0 ? <span className="rounded-full bg-[var(--site-accent)] px-1.5 text-xs text-[var(--site-on-accent)]">{quantity}</span> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    Seç
                </button>
            )}
        </li>
    );
}
