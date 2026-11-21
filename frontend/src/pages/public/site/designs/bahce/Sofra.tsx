import type { CSSProperties } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { EditableBlock } from '../../siteEdit';
import { useSiteEdit } from '../../siteEditContext';
import { DrawnPlate } from './BahceBits';
import { DISH_CYCLE, type DishKind } from './bahceParts';

// Yukarıdan bakılmış sofra (Bahçe Kahvaltısı kapağı): kapak renginde yuvarlak masa, ortasında büyük tabak (kapak
// fotoğrafı; yoksa ürün fotoğrafı, o da yoksa çizim), çevresinde menünün fotoğraflı ürünleri küçük tabaklarda, araya
// iki çay bardağı. Fotoğraf yetmezse tabaklar çizimle (yumurta, domates, zeytin…) dolar. Tabaklar sayfa açılınca birer
// birer masaya konur (hareket azaltmada durur). Süstür: ekran okuyucudan gizli.

interface Seat { x: number; y: number; s: number; tea?: boolean }

// Konumlar masanın yüzdesi (merkez); s: tabağın çapı (%).
const SEATS: Seat[] = [
    { x: 50, y: 50, s: 44 },
    { x: 22, y: 25, s: 23 },
    { x: 77, y: 21, s: 21 },
    { x: 87, y: 57, s: 18 },
    { x: 70, y: 85, s: 23 },
    { x: 31, y: 83, s: 20 },
    { x: 12, y: 54, s: 17 },
    { x: 51, y: 11, s: 11, tea: true },
    { x: 52, y: 90, s: 10, tea: true },
];

export function Sofra({ site, className }: { site: PublicSite; className?: string }) {
    const edit = useSiteEdit();
    const cover = site.site.coverImageUrl;
    const products = site.categories.flatMap(c => c.products).filter(p => p.imageUrl);
    const photos = [...products.filter(p => p.isFeatured), ...products.filter(p => !p.isFeatured)].map(p => ({ src: p.imageUrl, stock: p.isStockImage }));
    const center = cover ? { src: cover, stock: cover.includes('/shared/stock/') } : photos.shift() ?? null;
    let drawn = 0;
    const nextDish = (): DishKind => DISH_CYCLE[drawn++ % DISH_CYCLE.length];

    return (
        <div aria-hidden={edit ? undefined : true} className={cn('relative mx-auto aspect-square w-full max-w-[620px]', className)}>
            {/* Masa: kapak renginde daire, ince ağaç halkaları ve üstünde kareli peçete. */}
            <span className="rb-bh-table absolute inset-[3%] rounded-full bg-[var(--site-hero-bg)]" />
            <span className="rb-bh-cloth rb-bh-napkin absolute left-[56%] top-[30%] h-[30%] w-[30%] rotate-[14deg] rounded-[14%]" />
            {SEATS.map((seat, i) => {
                const style = { left: `${seat.x}%`, top: `${seat.y}%`, width: `${seat.s}%`, '--d': `${120 + i * 90}ms` } as CSSProperties;
                const base = 'rb-bh-set absolute -translate-x-1/2 -translate-y-1/2';
                if (seat.tea) return <span key={i} className={base} style={style}><DrawnPlate kind="tea" /></span>;
                if (i === 0) {
                    return (
                        <span key={i} className={base} style={style}>
                            <EditableBlock target="photo:cover" label="Kapak fotoğrafı" chip="Fotoğrafı değiştir" className="rounded-full">
                                {center ? (
                                    <span className="rb-bh-plate relative block aspect-square overflow-hidden rounded-full p-[5%]">
                                        <img src={center.src} alt="" className="block h-full w-full rounded-full object-cover" />
                                    </span>
                                ) : (
                                    <DrawnPlate kind="egg" />
                                )}
                                {edit && !cover && (
                                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-dashed border-[var(--site-border-strong)] bg-[var(--site-card)] px-3 py-1.5 font-[family-name:'DM_Sans',system-ui,sans-serif] text-[13px] font-semibold text-[var(--site-text)]">
                                        + Kapak fotoğrafı
                                    </span>
                                )}
                            </EditableBlock>
                        </span>
                    );
                }
                const photo = photos.shift();
                return (
                    <span key={i} className={base} style={style}>
                        {photo ? (
                            <span className="rb-bh-plate block aspect-square overflow-hidden rounded-full p-[7%]">
                                <img src={photo.src} alt="" loading="lazy" className="block h-full w-full rounded-full object-cover" />
                            </span>
                        ) : <DrawnPlate kind={nextDish()} />}
                    </span>
                );
            })}
            {center?.stock && <StockImageLabel className="bottom-[6%] right-[8%]" />}
        </div>
    );
}
