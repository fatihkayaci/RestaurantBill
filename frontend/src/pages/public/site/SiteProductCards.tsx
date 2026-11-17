import type { PublicCategory, PublicProduct } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../components/StockImageLabel';
import { serif, siteCard } from './siteParts';
import { formatSitePrice } from './siteTheme';

// Sitenin ürün kartları (menü sayfası, ana sayfa "Menüden seçmeler", Hakkımızda "İmza tabaklar").
// Fotoğraflı ürün: yatay kart, sağda kare fotoğraf. Fotoğrafsız ürün: bej kutu yerine metin kartı (ad ve fiyat arasında
// noktalı çizgi, altında açıklama ve hazırlık süresi rozeti). Fotoğrafı hiç olmayan kategori: klasik menü kâğıdı listesi.

/** "Ustanın seçimi" rozeti. */
export function FeaturedBadge({ className }: { className?: string }) {
    return (
        <span className={cn('self-start rounded-full bg-[var(--site-accent-soft)] px-2.5 py-[3px] text-[11px] font-bold tracking-[0.04em] text-[var(--site-accent-text)]', className)}>
            Ustanın seçimi
        </span>
    );
}

/** "~15 dk" hazırlık süresi rozeti; süre girilmemişse çizilmez. */
export function PrepBadge({ minutes, className }: { minutes: number | null | undefined; className?: string }) {
    if (!minutes) return null;
    return (
        <span className={cn('self-start whitespace-nowrap rounded-full bg-[var(--site-chip)] px-2.5 py-1 text-xs font-semibold text-[var(--site-sub)]', className)}>
            <span className="sr-only">Hazırlık süresi yaklaşık </span>~{minutes} dk
        </span>
    );
}

function SoldOutBadge({ product }: { product: PublicProduct }) {
    if (!product.isOutOfStock) return null;
    return <span className="self-start rounded-full bg-[var(--site-error-bg)] px-2.5 py-[3px] text-[11px] font-bold text-[var(--site-error)]">Şu an tükendi</span>;
}

/** Fotoğraflı yatay ürün kartı: solda ad, açıklama, fiyat ve rozetler; sağda kare fotoğraf. */
export function ProductPhotoCard({ product, className }: { product: PublicProduct; className?: string }) {
    const thumb = 'h-24 w-24 shrink-0 rounded-[14px] md:h-[116px] md:w-[116px]';
    return (
        <article className={cn(siteCard, 'flex min-w-0 items-stretch gap-4 p-3.5', className)}>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-0.5 py-1">
                <div className="flex flex-wrap gap-1.5 empty:hidden">
                    {product.isFeatured && <FeaturedBadge />}
                    <SoldOutBadge product={product} />
                </div>
                <h3 className="m-0 break-words text-[17px] font-bold leading-snug">{product.name}</h3>
                {product.description?.trim() && <p className="m-0 text-sm leading-[1.45] text-[var(--site-sub)]">{product.description}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <span className="whitespace-nowrap text-[17px] font-bold">{formatSitePrice(product.price)}</span>
                    <PrepBadge minutes={product.prepMinutes} />
                </div>
            </div>
            <div className="relative shrink-0">
                <img src={product.imageUrl} alt={product.name} loading="lazy" className={cn(thumb, 'block bg-[var(--site-placeholder)] object-cover')} />
                {product.isStockImage && <StockImageLabel />}
            </div>
        </article>
    );
}

/** Fotoğrafsız ürünün metin kartı: "Menemen ········ 220 ₺", altında açıklama ve "~10 dk" rozeti. */
export function ProductTextCard({ product, className }: { product: PublicProduct; className?: string }) {
    return (
        <article className={cn(siteCard, 'flex min-w-0 flex-col gap-1.5 p-5', className)}>
            {(product.isFeatured || product.isOutOfStock) && (
                <div className="flex flex-wrap gap-1.5">
                    {product.isFeatured && <FeaturedBadge />}
                    <SoldOutBadge product={product} />
                </div>
            )}
            <PriceLine name={product.name} price={product.price} as="h3" />
            {product.description?.trim() && <p className="m-0 text-sm leading-[1.45] text-[var(--site-sub)]">{product.description}</p>}
            <PrepBadge minutes={product.prepMinutes} className="mt-1" />
        </article>
    );
}

/** Ürünün fotoğrafı varsa fotoğraflı, yoksa metin kartı. */
export function MenuProductCard({ product, className }: { product: PublicProduct; className?: string }) {
    return product.imageUrl
        ? <ProductPhotoCard product={product} className={className} />
        : <ProductTextCard product={product} className={className} />;
}

/** Ad ve fiyat arasında noktalı çizgi. */
export function PriceLine({ name, price, as: Tag = 'span', className }: { name: string; price: number; as?: 'span' | 'h3'; className?: string }) {
    return (
        <div className={cn('flex items-baseline gap-3', className)}>
            <Tag className="m-0 min-w-0 break-words text-[17px] font-bold leading-snug">{name}</Tag>
            <span aria-hidden="true" className="mb-1 min-w-4 flex-1 border-b border-dotted border-[var(--site-border-strong)]" />
            <span className="shrink-0 whitespace-nowrap text-[17px] font-bold">{formatSitePrice(price)}</span>
        </div>
    );
}

/**
 * Klasik menü kâğıdı (fotoğrafı hiç olmayan kategori): tek kartta satır satır "Ad ···· fiyat" ve altında açıklama.
 * Kısa adlı kategoriler (İçecekler) tek kartta liste olur; tekrar eden boş kutu yok.
 */
export function ClassicMenuList({ category, items, className }: { category: PublicCategory; items: PublicProduct[]; className?: string }) {
    return (
        <div className={cn(siteCard, 'p-5 md:p-7', className)}>
            <ul aria-label={category.name} className="m-0 grid list-none grid-cols-1 gap-x-10 p-0 md:grid-cols-2">
                {items.map(p => (
                    <li key={p.id} className="flex flex-col gap-1 border-t border-[var(--site-border)] py-3.5 first:border-t-0 md:[&:nth-child(2)]:border-t-0">
                        <PriceLine name={p.name} price={p.price} />
                        {(p.description?.trim() || p.prepMinutes || p.isFeatured || p.isOutOfStock) && (
                            <div className="flex flex-wrap items-center gap-2">
                                {p.isFeatured && <FeaturedBadge />}
                                <SoldOutBadge product={p} />
                                {p.description?.trim() && <span className="text-sm text-[var(--site-sub)]">{p.description}</span>}
                                <PrepBadge minutes={p.prepMinutes} />
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Menü sayfası "Ustanın seçimi" şeridinin kartı: fotoğraf üstte (yoksa ad büyük serif), ad, süre, fiyat. */
export function FeaturedTile({ product }: { product: PublicProduct }) {
    return (
        <article className={cn(siteCard, 'flex w-[220px] shrink-0 snap-start flex-col gap-2.5 overflow-hidden p-2.5 md:w-[250px]')}>
            <div className="relative">
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} loading="lazy" className="block aspect-[4/3] w-full rounded-[14px] bg-[var(--site-placeholder)] object-cover" />
                ) : (
                    <div aria-hidden="true" className="flex aspect-[4/3] w-full items-center justify-center rounded-[14px] bg-[var(--site-placeholder)] px-4 text-center">
                        <span className={cn(serif, 'line-clamp-3 break-words text-[30px] italic leading-[0.95]')}>{product.name}</span>
                    </div>
                )}
                {product.isStockImage && <StockImageLabel />}
            </div>
            <div className="flex min-w-0 flex-col gap-1 px-1.5 pb-1.5">
                <h3 className="m-0 truncate text-base font-bold">{product.name}</h3>
                <div className="flex items-center justify-between gap-2">
                    <span className="whitespace-nowrap font-bold">{formatSitePrice(product.price)}</span>
                    <PrepBadge minutes={product.prepMinutes} />
                </div>
            </div>
        </article>
    );
}
