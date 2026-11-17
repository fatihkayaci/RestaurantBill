import { useState } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { InstagramIcon } from './SiteCards';
import { instagramHandle, serif } from './siteParts';
import { SITE_LIMITS, editTarget, useSiteEdit } from './siteEditContext';
import { photoTarget } from './venueData';

// Mekân sayfasının (tasarım: "Tema 2 · Açık — Mekân") kendi parçaları: fotoğrafsız kapağın masa planı süsü, galeri
// mozaiği, süs harita paneli ve olanak / yol ikonları. Yalnız RestaurantVenuePage kullanır.

const MOSAIC_SMALL = 4;

/** Fotoğrafsız (zeytin) kapağın sağındaki 4×4 masa planı (süs): 2 hardal masa, 1 krem çizgili masa, 0 kesikli boş yer. */
const TABLE_PLAN = [1, 1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1, 1, 0, 1];

export function TablePlan({ className }: { className?: string }) {
    return (
        <div aria-hidden="true" className={cn('pointer-events-none grid grid-cols-[repeat(4,56px)] gap-[22px]', className)}>
            {TABLE_PLAN.map((v, i) => (
                <span key={i} className={cn('h-14 w-14', i % 3 === 0 ? 'rounded-full' : 'rounded-[14px]',
                    v === 2 ? 'bg-[var(--site-mustard)]' : v === 1 ? 'border-2 border-[rgba(251,244,232,0.4)]' : 'border-2 border-dashed border-[rgba(251,244,232,0.2)]')} />
            ))}
        </div>
    );
}

/**
 * Galeri ızgarası: ilk fotoğraf 2×2 büyük kare, yanında en çok dört küçük kare; fazlası "+N fotoğraf" ile açılır.
 * Telefonda iki sütun (büyük kare tam genişlik). Düzenleyicide hep açık: her kare fotoğraf menüsünü açar, sonda
 * "+ Fotoğraf ekle" karesi (en çok 12). Instagram varsa büyük karenin köşesinde hap.
 */
export function VenueGallery({ site, photos, title }: { site: PublicSite; photos: string[]; title: string }) {
    const edit = useSiteEdit();
    const [expanded, setExpanded] = useState(false);
    const ig = site.site.instagramUrl;
    const igT = editTarget(edit, 'contact', 'Instagram');
    const open = Boolean(edit) || expanded;
    const canAdd = Boolean(edit) && site.site.galleryImageUrls.length < SITE_LIMITS.gallery;

    const [big, ...rest] = photos;
    const small = open ? rest : rest.slice(0, MOSAIC_SMALL);
    const hidden = photos.length - 1 - small.length;
    const cells = small.length + (canAdd ? 1 : 0);
    // Geniş ekranda büyük kare 2×2; küçük kare sayısına göre sütunlar boşluksuz dolar.
    const cols = cells === 0 ? 'md:grid-cols-1' : cells <= 2 ? 'md:grid-cols-3' : 'md:grid-cols-4';
    const tile = 'relative min-w-0 overflow-hidden rounded-[20px] md:rounded-[28px]';

    const shot = (src: string, i: number, className: string, lazy = true) => {
        const { target, label } = photoTarget(site, src);
        const t = editTarget(edit, target, label);
        return <img src={src} alt={`${title}, mekân fotoğrafı ${i + 1}`} loading={lazy ? 'lazy' : undefined} {...t} className={cn('block h-full w-full object-cover', className, t.className)} />;
    };
    // Telefonda tek kalan son kare tam genişlik (yatay); geniş ekranda tek küçük kare iki satır, üç küçük karenin sonuncusu iki sütun.
    const span = (i: number) => {
        const lastOdd = cells % 2 === 1 && i === cells - 1;
        return cn(lastOdd ? 'col-span-2 aspect-[2/1]' : 'aspect-square', 'md:aspect-auto',
            !open && cells === 1 && 'md:col-span-1 md:row-span-2',
            !open && cells === 3 && i === 2 ? 'md:col-span-2' : lastOdd && 'md:col-span-1');
    };

    return (
        <section aria-label="Mekândan fotoğraflar" className={cn('grid grid-cols-2 gap-2.5 sm:gap-4', cells > 0 && 'md:auto-rows-[260px]', cols)}>
            <div className={cn(tile, cells === 0 ? 'col-span-full aspect-[4/3] md:aspect-[16/9]' : 'col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto')}>
                {shot(big, 0, 'absolute inset-0', false)}
                {ig && (
                    <a href={ig} target="_blank" rel="noopener noreferrer" {...igT}
                        className={cn('absolute left-3 top-3 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--site-card)]/90 px-4 text-sm font-bold text-[var(--site-text)] no-underline shadow-[0_4px_14px_rgba(36,24,15,0.14)] backdrop-blur-[8px] transition-opacity hover:opacity-90 md:left-4 md:top-4 [&>svg]:h-4 [&>svg]:w-4', igT.className)}>
                        <InstagramIcon />{instagramHandle(ig)}
                    </a>
                )}
            </div>
            {small.map((src, i) => {
                const more = !open && i === small.length - 1 && hidden > 0;
                return (
                    <div key={src} className={cn(tile, span(i))}>
                        {shot(src, i + 1, 'absolute inset-0')}
                        {more && (
                            <button type="button" onClick={() => setExpanded(true)}
                                className="absolute inset-0 flex items-center justify-center bg-[rgba(20,16,12,0.55)] text-lg font-bold text-white">
                                +{hidden} fotoğraf
                            </button>
                        )}
                    </div>
                );
            })}
            {canAdd && (
                <div data-edit-target="gallery:add"
                    className={cn(tile, "flex cursor-pointer items-center justify-center border border-dashed border-[#CFC5B4] bg-[var(--site-card)] font-[family-name:'DM_Sans',system-ui,sans-serif] text-[15px] font-semibold text-[#8A7D6E] hover:border-[#2B7FFF] hover:text-[#1E4FA0]", span(small.length))}>
                    + Fotoğraf ekle
                </div>
            )}
        </section>
    );
}

/** Süs amaçlı harita paneli (gerçek harita değil): ızgara, yollar, su kıyısı ve restoranın adıyla iğne. */
export function MapPanel({ name, className }: { name: string; className?: string }) {
    return (
        <div aria-hidden="true"
            className={cn('relative overflow-hidden bg-[#ECE4D7] bg-[linear-gradient(rgba(36,24,15,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(36,24,15,0.05)_1px,transparent_1px)] bg-[length:40px_40px]', className)}>
            <span className="absolute -left-[10%] -right-[10%] top-[40%] h-[18px] -rotate-[8deg] bg-[#FBF8F3]" />
            <span className="absolute -left-[10%] -right-[10%] top-[74%] h-2.5 rotate-[5deg] bg-[#FBF8F3]" />
            <span className="absolute -bottom-[10%] -top-[10%] left-[64%] w-3 rotate-[14deg] bg-[#FBF8F3]" />
            <span className="absolute right-0 top-0 h-[52%] w-[30%] rounded-bl-[140px] bg-[#CBDAD3]" />
            <div className="absolute left-[44%] top-[42%] flex max-w-[80%] -translate-x-1/2 -translate-y-full flex-col items-center">
                <span className={cn(serif, 'max-w-full truncate font-semibold rounded-[14px] bg-[var(--site-paper)] px-4 py-2.5 text-xl text-[var(--site-on-paper)]')}>{name}</span>
                <span className="mt-1.5 h-[22px] w-[22px] rounded-full border-4 border-white bg-[var(--site-accent)] shadow-[0_4px_12px_rgba(0,0,0,0.25)]" />
            </div>
        </div>
    );
}

// ── İkonlar (çizgi, currentColor) ────────────────────────────────────────────────────────────────

const AMENITY_ICONS: Record<string, string> = {
    avlu: 'M12 22v-6M7 16h10a4 4 0 0 0 1-7.9A6 6 0 0 0 6.1 7 4.5 4.5 0 0 0 7 16z',
    teras: 'M12 3v1M5.6 5.6l.7.7M3 12h1M18.4 5.6l-.7.7M21 12h-1M16 12a4 4 0 0 0-8 0M3 16h18M5 20h14',
    otopark: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 6H7.3a2 2 0 0 0-1.6.8L3 10.5l-.6.3C1.6 11.1 1 11.9 1 12.8V16c0 .6.4 1 1 1h2M7 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
    vale: 'M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 11v10M12 17h3M12 20h2',
    cocuk: 'M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1',
    wifi: 'M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01',
    engelli: 'M12 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM10 7h4l-1 6h4l2 6M9 10a6 6 0 1 0 6.9 8.5',
    evcil: 'M11 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM21 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM12 12c-2.5 0-5 3.5-5 6a2.5 2.5 0 0 0 3 2.4c.7-.2 1.3-.4 2-.4s1.3.2 2 .4a2.5 2.5 0 0 0 3-2.4c0-2.5-2.5-6-5-6z',
    'canli-muzik': 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    vejetaryen: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.2-6',
    'kartla-odeme': 'M2 5h20v14H2zM2 10h20M6 15h4',
    // Yüksek sandalye: oturak, sırtlık, tepsi ve ayaklar.
    'bebek-sandalyesi': 'M7 3h10v7H7zM5 10h14M8 10l-2 11M16 10l2 11M7 16h10',
    // Aile: iki büyük, bir küçük baş ve gövdeler.
    'aile-salonu': 'M7 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM4 21v-7a3 3 0 0 1 6 0v7M14 21v-7a3 3 0 0 1 6 0v7M10 21v-4a2 2 0 0 1 4 0v4',
    // Sigara: çubuk, kül ucu ve duman.
    'sigara-alani': 'M2 16h15v4H2zM19 16h1v4h-1M22 16v4M18 12c0-2 2-2 2-4s-2-2-2-4M21 12c0-2 1-2 1-4',
    // Pasta: üç kat ve mumlar.
    'ozel-gun': 'M4 21h16M5 21v-6h14v6M7 15v-4h10v4M9 11V8M12 11V7M15 11V8M12 5v.01M9 6v.01M15 6v.01',
};

const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function AmenityIcon({ amenity }: { amenity: string }) {
    const d = AMENITY_ICONS[amenity];
    if (!d) return null;
    return <svg {...iconProps} width="24" height="24" strokeWidth="1.6"><path d={d} /></svg>;
}

const WAY_ICONS = {
    address: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    route: 'M3 11l19-9-9 19-2-8-8-2z',
    parking: AMENITY_ICONS.otopark,
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
} as const;

export function WayIcon({ kind }: { kind: keyof typeof WAY_ICONS }) {
    return <svg {...iconProps} width="20" height="20" strokeWidth="1.7"><path d={WAY_ICONS[kind]} /></svg>;
}
