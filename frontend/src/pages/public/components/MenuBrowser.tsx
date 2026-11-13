import { Clock, Minus, Plus } from 'lucide-react';
import type { PublicCategory, PublicProduct } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { headingFont } from '../site/siteTheme';

interface Props {
    categories: PublicCategory[];
    /** Verilirse ürünlerde sepete ekle/çıkar düğmeleri çıkar; verilmezse menü yalnızca okunur. */
    quantities?: Record<string, number>;
    onAdd?: (product: PublicProduct) => void;
    onRemove?: (product: PublicProduct) => void;
    /** Yapışkan kategori şeridinin üstten boşluğu (sayfanın kendi yapışkan başlığı varsa). */
    stickyTopClass?: string;
    /** Yapışkan şeridin zemini; sayfanın arka planıyla aynı olmalı. */
    stickyBgClass?: string;
}

// Müşteri menüsü ("Ocak" görünümü): üstte kategori çipleri (bölüme kaydırır), altında kategorilere göre ürünler.
// Yalnızca okunurken fiyat noktalı çizgiyle ada bağlanır; sipariş sayfasında sağda +/− düğmeleri çıkar.
export default function MenuBrowser({
    categories, quantities, onAdd, onRemove, stickyTopClass = 'top-0', stickyBgClass = 'bg-[var(--site-band)]/95',
}: Props) {
    const orderable = Boolean(quantities && onAdd && onRemove);

    if (categories.length === 0) {
        return <p className="px-4 py-12 text-center text-base text-[var(--site-sub)]">Menü henüz hazırlanmadı.</p>;
    }

    return (
        <div>
            <nav
                aria-label="Menü kategorileri"
                className={cn('sticky z-10 flex gap-2 overflow-x-auto px-4 py-2.5 backdrop-blur-sm md:flex-wrap md:px-6', stickyTopClass, stickyBgClass)}
            >
                {categories.map(category => (
                    <a
                        key={category.id}
                        href={`#kategori-${category.id}`}
                        className="flex h-11 shrink-0 items-center rounded-full border border-[var(--site-border-strong)] px-5 text-[15px] font-semibold text-[var(--site-text)] no-underline transition-colors hover:border-[var(--site-accent)] hover:text-[var(--site-accent)]"
                    >
                        {category.name}
                    </a>
                ))}
            </nav>

            <div className="flex flex-col gap-10 px-4 pb-6 pt-6 md:px-6 md:pt-8">
                {categories.map(category => (
                    <section key={category.id} id={`kategori-${category.id}`} className="scroll-mt-32">
                        <h3 className={cn(headingFont, 'text-[22px] font-bold leading-tight md:text-[28px]')}>{category.name}</h3>
                        <ul className={cn('mt-1', !orderable && 'md:grid md:grid-cols-2 md:gap-x-16')}>
                            {category.products.map(product => orderable
                                ? <OrderableRow key={product.id} product={product} quantity={quantities?.[product.id] ?? 0} onAdd={onAdd!} onRemove={onRemove!} />
                                : <ReadOnlyRow key={product.id} product={product} />)}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
}

/** "~15 dk": ürünün tahmini hazırlanma süresi. Süre girilmemişse hiçbir şey çizmez. */
function PrepTime({ minutes, className }: { minutes: number | null | undefined; className?: string }) {
    if (minutes == null) return null;
    return (
        <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium text-[var(--site-sub)]', className)}>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span><span className="sr-only">Hazırlanma süresi yaklaşık </span>~{minutes} dk</span>
        </span>
    );
}

function ReadOnlyRow({ product }: { product: PublicProduct }) {
    return (
        <li className="flex items-center gap-3 border-b border-[var(--site-border)] py-4 md:py-[18px]">
            {product.imageUrl && (
                <img src={product.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            )}
            <div className="flex min-w-0 flex-1 items-baseline gap-3">
                <span className="min-w-0 text-base font-semibold leading-snug md:text-lg">
                    {product.name}
                    <PrepTime minutes={product.prepMinutes} className="ml-2 align-middle" />
                </span>
                <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--site-border-strong)]" />
                <span className={cn(headingFont, 'shrink-0 text-[17px] font-bold tabular-nums md:text-xl')}>{formatPrice(product.price)} ₺</span>
            </div>
        </li>
    );
}

interface OrderableRowProps {
    product: PublicProduct;
    quantity: number;
    onAdd: (product: PublicProduct) => void;
    onRemove: (product: PublicProduct) => void;
}

function OrderableRow({ product, quantity, onAdd, onRemove }: OrderableRowProps) {
    return (
        <li className="flex items-center gap-3.5 border-b border-[var(--site-border)] py-3.5">
            {product.imageUrl && (
                <img src={product.imageUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-[14px] object-cover" />
            )}
            <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-snug">{product.name}</p>
                <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className={cn(headingFont, 'text-base font-bold tabular-nums text-[var(--site-sub)]')}>{formatPrice(product.price)} ₺</span>
                    <PrepTime minutes={product.prepMinutes} />
                </p>
            </div>
            {quantity === 0 ? (
                <button
                    type="button"
                    onClick={() => onAdd(product)}
                    aria-label={`${product.name} sepete ekle`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-border-strong)] text-[var(--site-text)] transition-colors hover:border-[var(--site-accent)]"
                >
                    <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                </button>
            ) : (
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-raised)] p-0.5">
                    <button
                        type="button"
                        onClick={() => onRemove(product)}
                        aria-label={`${product.name} bir azalt`}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-text)]"
                    >
                        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                    <span className="min-w-5 text-center text-base font-bold" aria-live="polite">{quantity}</span>
                    <button
                        type="button"
                        onClick={() => onAdd(product)}
                        aria-label={`${product.name} bir artır`}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                </div>
            )}
        </li>
    );
}
