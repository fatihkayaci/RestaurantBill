import type { ReactNode } from 'react';
import { Clock, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageSlot } from '../../SiteChrome';
import { formatSitePrice } from '../../siteTheme';
import { serif } from '../../siteParts';
import { DrawnPlate } from './BahceBits';
import { dishFor } from './bahceParts';

// Ortak menünün (DeliveryMenu, variant "bahce") Bahçe Kahvaltısı parçaları: tabak simgeli bölüm başlığı ve yuvarlak
// köşeli ürün kartları (solda yuvarlak tabakta fotoğraf; fotoğraf yoksa adına göre çizimli tabak), iki sütun. Site Menü
// sayfası, ana sayfanın "Bugün masada" bölümü, masa QR menüsü ve paket sipariş menüsü aynı parçaları kullanır.

/** Bölüm başlığı: küçük çizimli tabak, kalın ad, yanında "8 çeşit" çipi, altında isteğe bağlı not. */
export function BahceCategoryHeader({ id, name, total, note }: { id: string; name: string; total: number; note?: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
                <DrawnPlate kind={dishFor(name)} className="w-11 shrink-0 sm:w-12" />
                <h2 id={id} className={cn(serif, 'm-0 min-w-0 break-words text-[26px] leading-[1.05] tracking-[-0.03em] sm:text-[32px]')}>{name}</h2>
                <span className="ml-auto shrink-0 rounded-full bg-[var(--site-alt)] px-3 py-1 text-[13px] font-bold tabular-nums text-[var(--site-sub)]">{total} çeşit</span>
            </div>
            {note && <p className="m-0 pl-14 text-sm text-[var(--site-sub)] sm:pl-[60px]">{note}</p>}
        </div>
    );
}

export interface BahceItem {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    isStockImage: boolean;
    description?: string;
    soldOut: boolean;
    featured: boolean;
    prepMinutes?: number | null;
    quantity: number;
    /** true: ekleme düğmesi yok (sipariş kapalı ya da ürün paket menüsünde yok). */
    readOnly: boolean;
    onAdd: () => void;
    onRemove: () => void;
}

/** İki sütun ürün kartları (telefonda tek sütun). */
export function BahceItems({ items, restaurant, className }: { items: BahceItem[]; restaurant: string; className?: string }) {
    return (
        <ul className={cn('m-0 grid list-none gap-3 p-0 md:grid-cols-2 md:gap-4', className)}>
            {items.map(item => <li key={item.id} className="min-w-0"><BahceItemCard item={item} restaurant={restaurant} /></li>)}
        </ul>
    );
}

function BahceItemCard({ item, restaurant }: { item: BahceItem; restaurant: string }) {
    const { name, soldOut, quantity, readOnly } = item;
    const inCart = quantity > 0;
    const description = item.description?.trim();
    const prep = item.prepMinutes && item.prepMinutes > 0 ? item.prepMinutes : null;
    return (
        <article className={cn('flex h-full items-center gap-4 rounded-[26px] border bg-[var(--site-card)] p-3 pr-4 transition-colors',
            inCart ? 'border-[var(--site-accent)] shadow-[0_0_0_1px_var(--site-accent)]' : 'border-[var(--site-border)]',
            !inCart && !soldOut && 'hover:border-[var(--site-border-strong)]')}>
            <div className="relative w-[84px] shrink-0 sm:w-[96px]">
                {item.imageUrl ? (
                    <span className="rb-bh-plate block aspect-square overflow-hidden rounded-full p-[6%]">
                        <ImageSlot src={item.imageUrl} alt={name} restaurant={restaurant} logoTextClassName="text-[min(11px,13cqw)]"
                            className={cn('aspect-square h-full rounded-full', soldOut && 'opacity-50 grayscale')} />
                        {item.isStockImage && <span className="sr-only"> (temsili görsel)</span>}
                    </span>
                ) : (
                    <DrawnPlate kind={dishFor(name)} className={cn(soldOut && 'opacity-50 grayscale')} />
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                {(inCart || (item.featured && !soldOut)) && (
                    <span className="flex flex-wrap items-center gap-1.5">
                        {inCart && <span className="rounded-full bg-[var(--site-accent)] px-2 py-0.5 text-xs font-bold tabular-nums text-[var(--site-on-accent)]">Sepette {quantity}</span>}
                        {item.featured && !soldOut && <span className="rounded-full bg-[var(--site-mustard)] px-2 py-0.5 text-xs font-bold text-[var(--site-text)]">Mutfağın önerisi</span>}
                    </span>
                )}
                <h3 className={cn(serif, 'm-0 break-words text-[18px] leading-[1.15] tracking-[-0.02em] sm:text-[19px]', soldOut && 'text-[var(--site-sub)]')}>{name}</h3>
                {description && <p className="m-0 line-clamp-2 text-sm leading-snug text-[var(--site-sub)]">{description}</p>}
                {soldOut ? (
                    <p className="m-0 text-[13px] font-bold text-[var(--site-sub)]">Bugünlük bitti</p>
                ) : prep ? (
                    <p className="m-0 flex items-center gap-1 text-[13px] text-[var(--site-sub)]"><Clock className="h-3.5 w-3.5" aria-hidden="true" />~{prep} dk<span className="sr-only"> hazırlanma süresi</span></p>
                ) : null}
                <div className="mt-1 flex min-h-11 items-center justify-between gap-2">
                    <span className={cn('whitespace-nowrap text-[17px] font-extrabold tabular-nums', soldOut ? 'text-[var(--site-sub)] line-through decoration-1' : 'text-[var(--site-accent-text)]')}>
                        {formatSitePrice(item.price)}
                    </span>
                    {soldOut && !inCart ? null : readOnly && !inCart ? null : inCart ? (
                        <span className="flex shrink-0 items-center rounded-full bg-[var(--site-accent)] text-[var(--site-on-accent)]">
                            <button type="button" onClick={item.onRemove} aria-label={`${name} bir azalt`} className="flex h-11 w-10 items-center justify-center rounded-full">
                                <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                            </button>
                            <span className="min-w-5 text-center text-[15px] font-bold tabular-nums" aria-live="polite">{quantity}</span>
                            <button type="button" onClick={item.onAdd} disabled={soldOut || readOnly} aria-label={`${name} bir artır`} className="flex h-11 w-10 items-center justify-center rounded-full disabled:opacity-40">
                                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                            </button>
                        </span>
                    ) : (
                        <button type="button" onClick={item.onAdd} aria-label={`${name} sepete ekle`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--site-mustard)] text-[var(--site-text)] transition-[transform,filter] hover:brightness-95 active:scale-95 motion-reduce:transition-none">
                            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}
