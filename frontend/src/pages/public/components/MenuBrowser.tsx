import { Minus, Plus } from 'lucide-react';
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
    /** "app": uygulamanın renkleri (masa sipariş sayfası). "site": restoran sitesinin Sıcak görünümü. */
    tone?: 'app' | 'site';
}

const TONES = {
    app: {
        nav: 'border-b border-border bg-background/95',
        chip: 'border-border bg-card text-foreground hover:border-rb-gold',
        title: 'font-serif text-[26px] text-foreground',
        list: 'divide-border border-border bg-card',
        name: 'text-foreground',
        price: 'mt-0.5 text-[15px] font-semibold text-rb-text-sub',
        empty: 'text-rb-text-sub',
    },
    site: {
        nav: 'bg-[var(--site-band)]/95',
        chip: 'border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-accent)]',
        title: cn(headingFont, 'text-[22px] text-[var(--site-text)] md:text-[26px]'),
        list: 'divide-[var(--site-border)] border-[var(--site-border)] bg-[var(--site-card)]',
        name: 'text-base text-[var(--site-text)]',
        price: cn(headingFont, 'shrink-0 text-lg font-bold tabular-nums text-[var(--site-text)]'),
        empty: 'text-[var(--site-sub)]',
    },
} as const;

// Müşteri menüsü: üstte kategori çipleri (bölüme kaydırır), altında kategorilere göre ürünler.
export default function MenuBrowser({ categories, quantities, onAdd, onRemove, stickyTopClass = 'top-0', tone = 'app' }: Props) {
    const orderable = Boolean(quantities && onAdd && onRemove);
    const t = TONES[tone];
    // Sitede fiyat sağda büyük yazılır (tasarım); sipariş sayfasında adın altında kalır, sağda +/− var.
    const priceOnRight = tone === 'site' && !orderable;

    if (categories.length === 0) {
        return <p className={cn('px-4 py-12 text-center text-base', t.empty)}>Menü henüz hazırlanmadı.</p>;
    }

    return (
        <div>
            <nav
                aria-label="Menü kategorileri"
                className={cn('sticky z-10 flex gap-2 overflow-x-auto px-4 py-2.5 backdrop-blur-sm', stickyTopClass, t.nav)}
            >
                {categories.map(category => (
                    <a
                        key={category.id}
                        href={`#kategori-${category.id}`}
                        className={cn('flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold no-underline transition-colors', t.chip)}
                    >
                        {category.name}
                    </a>
                ))}
            </nav>

            <div className="flex flex-col gap-7 px-4 pb-6 pt-5">
                {categories.map(category => (
                    <section key={category.id} id={`kategori-${category.id}`} className="scroll-mt-32">
                        <h2 className={cn('font-bold leading-tight', t.title)}>{category.name}</h2>
                        <ul className={cn('mt-2 divide-y rounded-2xl border', t.list)}>
                            {category.products.map(product => {
                                const quantity = quantities?.[product.id] ?? 0;
                                return (
                                    <li key={product.id} className="flex items-center gap-3 p-3">
                                        {product.imageUrl && (
                                            <img
                                                src={product.imageUrl}
                                                alt=""
                                                loading="lazy"
                                                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className={cn('text-[15px] font-semibold leading-snug', t.name)}>{product.name}</p>
                                            {!priceOnRight && <p className={t.price}>{formatPrice(product.price)} ₺</p>}
                                        </div>
                                        {priceOnRight && <p className={t.price}>{formatPrice(product.price)} ₺</p>}
                                        {orderable && (quantity === 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => onAdd!(product)}
                                                aria-label={`${product.name} sepete ekle`}
                                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rb-gold text-rb-gold-foreground transition-opacity hover:opacity-90"
                                            >
                                                <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                                            </button>
                                        ) : (
                                            <div className="flex shrink-0 items-center rounded-full border border-rb-gold/60 bg-rb-gold-bg">
                                                <button
                                                    type="button"
                                                    onClick={() => onRemove!(product)}
                                                    aria-label={`${product.name} bir azalt`}
                                                    className="flex h-11 w-11 items-center justify-center rounded-full text-foreground"
                                                >
                                                    <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                </button>
                                                <span className="min-w-6 text-center text-base font-bold text-foreground" aria-live="polite">{quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => onAdd!(product)}
                                                    aria-label={`${product.name} bir artır`}
                                                    className="flex h-11 w-11 items-center justify-center rounded-full text-foreground"
                                                >
                                                    <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                                </button>
                                            </div>
                                        ))}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>
        </div>
    );
}
