import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSitePrice } from '../../siteTheme';
import { ImageSlot } from '../../SiteChrome';
import { serif } from '../../siteParts';

// Meze tepsisi (Meyhane Gecesi): mezeler satır satır değil, tepsideki küçük kâseler gibi yan yana: yuvarlak fotoğraf
// (yoksa desenli kâse ve adın ilk harfi), altında ad, fiyat ve küçük ekle / −+ düğmesi. Ana sayfa, site Menü sayfası,
// masa QR menüsü ve paket sipariş menüsü aynı tepsiyi kullanır (sepet bağlantısı çağıranda).

export interface MezeItem {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    isStockImage: boolean;
    description?: string;
    soldOut: boolean;
    featured: boolean;
    quantity: number;
    /** true: ekleme düğmesi yok (sipariş kapalı ya da ürün paket menüsünde yok). */
    readOnly: boolean;
    onAdd: () => void;
    onRemove: () => void;
}

export function MezeTray({ items, restaurant, className }: { items: MezeItem[]; restaurant: string; className?: string }) {
    return (
        <ul className={cn('rb-mh-tray m-0 grid list-none grid-cols-2 gap-x-3 gap-y-7 rounded-[28px] px-3 pb-6 pt-7 min-[480px]:grid-cols-3 sm:gap-x-5 sm:px-6 sm:pt-9 lg:grid-cols-4 xl:grid-cols-5', className)}>
            {items.map(item => <li key={item.id} className="min-w-0"><MezeBowl item={item} restaurant={restaurant} /></li>)}
        </ul>
    );
}

function MezeBowl({ item, restaurant }: { item: MezeItem; restaurant: string }) {
    const { name, soldOut, quantity, readOnly } = item;
    const inCart = quantity > 0;
    return (
        <article className="flex h-full flex-col items-center text-center">
            <div className={cn('rb-mh-bowl relative aspect-square w-full max-w-[136px] overflow-hidden rounded-full', inCart && 'outline outline-2 outline-offset-4 outline-[var(--site-accent-text)]')}>
                {item.imageUrl ? (
                    <ImageSlot src={item.imageUrl} alt={name} restaurant={restaurant} className={cn('h-full', soldOut && 'opacity-50 grayscale')} />
                ) : (
                    <span role="img" aria-label={name}
                        className={cn(serif, 'flex h-full w-full items-center justify-center bg-[var(--site-placeholder)] text-[40px] leading-none text-[var(--site-accent-text)]', soldOut && 'opacity-50')}>
                        {name.trim().charAt(0).toLocaleUpperCase('tr-TR')}
                    </span>
                )}
                {item.imageUrl && item.isStockImage && <span className="sr-only"> (temsili görsel)</span>}
            </div>
            <h3 className={cn(serif, 'm-0 mt-3.5 line-clamp-2 text-[17px] leading-[1.2] sm:text-lg', soldOut && 'text-[var(--site-sub)]')}>{name}</h3>
            {item.description?.trim() && <p className="m-0 mt-1 line-clamp-2 text-[13px] leading-snug text-[var(--site-sub)]">{item.description}</p>}
            {item.featured && !soldOut && <p className="m-0 mt-1 text-[13px] font-bold text-[var(--site-accent-text)]">Ustanın seçimi</p>}
            <div className="mt-auto flex min-h-11 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 pt-2.5">
                <span className={cn('whitespace-nowrap text-[17px] font-bold tabular-nums', soldOut ? 'text-[var(--site-sub)] line-through decoration-1' : 'text-[var(--site-accent-text)]')}>
                    {formatSitePrice(item.price)}
                </span>
                {soldOut && !inCart ? (
                    <span className="text-[13px] font-bold text-[var(--site-sub)]">Bugünlük bitti</span>
                ) : readOnly && !inCart ? null : inCart ? (
                    <span className="flex items-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]">
                        <button type="button" onClick={item.onRemove} aria-label={`${name} bir azalt`} className="flex h-11 w-9 items-center justify-center rounded-full">
                            <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <span className="min-w-4 text-center text-[15px] font-bold tabular-nums" aria-live="polite">{quantity}</span>
                        <button type="button" onClick={item.onAdd} disabled={soldOut || readOnly} aria-label={`${name} bir artır`} className="flex h-11 w-9 items-center justify-center rounded-full disabled:opacity-40">
                            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                    </span>
                ) : (
                    <button type="button" onClick={item.onAdd} aria-label={`${name} sepete ekle`}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--site-accent-line)] text-[var(--site-accent-text)] transition-colors hover:bg-[var(--site-accent)] hover:text-[var(--site-on-accent)]">
                        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                )}
            </div>
        </article>
    );
}
