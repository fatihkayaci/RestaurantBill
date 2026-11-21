import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Minus, Package, Plus, Star } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../components/StockImageLabel';
import { initials } from '../site/siteTheme';
import { useQrBrand } from './qrBrand';
import { categoryIcon, type QrItem } from './qrModel';
import { card, focusRing, priceText, sectionTitle } from './qrUi';

// Masa menüsünün küçük parçaları: marka işareti, görsel (yer tutuculu), fiyat, "+" düğmesi, adet seçici, büyük kart ve
// liste satırı.

/** Kategorinin simgesi (adından tahmin; süs). */
export function CategoryGlyph({ category, className }: { category: { id: string; name: string }; className?: string }) {
    return createElement(categoryIcon(category), { className, 'aria-hidden': true });
}

export function Price({ value, className }: { value: number; className?: string }) {
    return <span className={cn(priceText, className)}>{formatPrice(value)} ₺</span>;
}

/** Hazır menü indirimi: ayrı ayrı alınınca tutarı üstü çizili. */
export function RegularPrice({ item }: { item: QrItem }) {
    if (item.regularPrice == null) return null;
    return (
        <span className="text-[13px] font-semibold tabular-nums text-[var(--site-muted)] line-through">
            <span className="sr-only">Ayrı ayrı </span>{formatPrice(item.regularPrice)} ₺
        </span>
    );
}

// ── Marka ve görseller ─────────────────────────────────────────────────────────────────────

/** Başlıktaki marka işareti: restoranın logosu; logo yoksa ya da yüklenemezse adın baş harfleri. */
export function BrandMark({ className }: { className?: string }) {
    const { name, logoUrl } = useQrBrand();
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const showLogo = !!logoUrl && failedUrl !== logoUrl;
    return (
        <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full',
            showLogo ? 'border border-[var(--site-border)] bg-[var(--site-card)] p-1.5'
                : 'bg-[var(--site-accent-soft)] font-[family-name:var(--site-serif,Fraunces,Georgia,serif)] text-[17px] font-bold text-[var(--site-accent-text)]',
            className)}>
            {showLogo ? <img src={logoUrl} alt="" className="h-full w-full object-contain" onError={() => setFailedUrl(logoUrl)} /> : initials(name)}
        </span>
    );
}

/**
 * Kalemin görseli. Fotoğraf yoksa ya da yüklenemezse aynı kutuda yer tutucu: restoranın logosu (soluk), logo da yoksa
 * kategorinin simgesi. Kutuya yazı konmaz; ad her zaman kutunun yanında/altında durur.
 */
export function QrImage({ src, alt, category, className, eager = false }: {
    src?: string | null; alt: string; category: { id: string; name: string }; className: string; eager?: boolean;
}) {
    const { logoUrl } = useQrBrand();
    const [failed, setFailed] = useState<string[]>([]);
    if (src && !failed.includes(src)) {
        return (
            <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(f => [...f, src])}
                className={cn('block w-full bg-[var(--site-placeholder)] object-cover', className)} />
        );
    }
    const logo = logoUrl && !failed.includes(logoUrl) ? logoUrl : null;
    return (
        <div role={alt ? 'img' : undefined} aria-label={alt || undefined}
            className={cn('flex w-full items-center justify-center overflow-hidden bg-[var(--site-placeholder)]', className)}>
            {logo ? (
                <img src={logo} alt="" onError={() => setFailed(f => [...f, logo])}
                    className="block max-h-[46%] max-w-[46%] object-contain opacity-60 grayscale" />
            ) : (
                <CategoryGlyph category={category} className="h-[34%] max-h-12 w-[34%] max-w-12 text-[var(--site-muted)]" />
            )}
        </div>
    );
}

/**
 * Vurgu renkli "+" (görünen 32–36 px, dokunma alanı 44 px). Dokununca kısa süre "✓" olur; yalnız gerçekten eklendiyse
 * (seçimli menü ayrıntıyı açar, onClick false döner).
 */
export function AddButton({ label, onClick, size = 'md' }: { label: string; onClick: () => boolean | void; size?: 'sm' | 'md' }) {
    const [added, setAdded] = useState(false);
    const timer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    const click = () => {
        if (onClick() === false) return;
        setAdded(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setAdded(false), 1200);
    };
    const icon = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';
    return (
        <button type="button" onClick={click} aria-label={label}
            className={cn('group -m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full', focusRing)}>
            <span aria-hidden="true" className={cn('flex items-center justify-center rounded-full transition-[transform,background-color] duration-200 group-active:scale-90 motion-reduce:transition-none',
                added ? 'bg-[var(--site-ok)] text-[var(--site-ok-bg)]' : 'bg-[var(--site-accent)] text-[var(--site-on-accent)]',
                size === 'sm' ? 'h-8 w-8' : 'h-9 w-9')}>
                {added ? <Check className={cn(icon, 'qr-pop')} strokeWidth={3} /> : <Plus className={icon} strokeWidth={2.75} />}
            </span>
        </button>
    );
}

/** Adet seçici: "− 1 +" (her düğme 44 px). */
export function Stepper({ value, name, onMinus, onPlus, min = 0, compact = false }: {
    value: number; name: string; onMinus: () => void; onPlus: () => void; min?: number; compact?: boolean;
}) {
    return (
        <div className={cn('flex shrink-0 items-center rounded-full', compact ? 'gap-0' : 'gap-0.5 border border-[var(--site-border-mid)] bg-[var(--site-card)]')}>
            <button type="button" onClick={onMinus} disabled={value <= min} aria-label={`${name} bir azalt`}
                className={cn('flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-text)] disabled:opacity-35', focusRing)}>
                <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="min-w-6 text-center text-base font-extrabold tabular-nums" aria-live="polite">
                <span className="sr-only">{name} adedi: </span>{value}
            </span>
            <button type="button" onClick={onPlus} aria-label={`${name} bir artır`}
                className={cn('flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-text)]', focusRing)}>
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
        </div>
    );
}

/** Kartın görseli üstündeki küçük rozet (Öne çıkan, Menü, Tükendi). */
function ImageBadge({ children, tone = 'light' }: { children: ReactNode; tone?: 'light' | 'muted' }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-[0_2px_8px_rgba(0,0,0,0.16)]',
            tone === 'light' ? 'bg-[var(--site-card)] text-[var(--site-text)]' : 'bg-[var(--site-text)] text-[var(--site-bg)]')}>
            {children}
        </span>
    );
}

function itemBadge(item: QrItem, showFeatured: boolean) {
    if (item.soldOut) return <ImageBadge tone="muted">Tükendi</ImageBadge>;
    if (item.featured && showFeatured) return <ImageBadge><Star className="h-3.5 w-3.5 fill-current text-[var(--site-accent-text)]" aria-hidden="true" />Öne çıkan</ImageBadge>;
    if (item.kind === 'setMenu') return <ImageBadge>Menü</ImageBadge>;
    return null;
}

const itemCategory = (item: QrItem) => ({ id: item.categoryId, name: item.categoryName });

interface ItemProps {
    item: QrItem;
    /** Sepetteki adedi (rozet olarak). */
    quantity: number;
    onOpen: () => void;
    /** null: eklenemez (sipariş kapalı ya da tükendi), "+" çizilmez. false dönerse eklenmedi. */
    onAdd: (() => boolean | void) | null;
    /** Sepetteyse bir adet azaltır; null: sepette yok (yalnız "+" çizilir). */
    onRemove?: (() => void) | null;
}

/**
 * Kartın sağ altındaki ekleme alanı: sepette yoksa yalnız "+"; sepetteyse "− adet +" (sepete girmeden azaltılır).
 * Kartın ayrıntı açan katmanının üstünde durur (z-10).
 */
function CardQuantityControl({ name, quantity, onAdd, onRemove, size = 'md' }: {
    name: string; quantity: number; onAdd: (() => boolean | void) | null; onRemove?: (() => void) | null; size?: 'sm' | 'md';
}) {
    if (quantity > 0 && onRemove) {
        return (
            <span className="relative z-10 flex items-center rounded-full bg-[var(--site-accent-soft)]">
                <button type="button" onClick={onRemove} aria-label={`${name} bir adet azalt`}
                    className={cn('group -m-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--site-accent-text)]', focusRing)}>
                    <span aria-hidden="true" className={cn('flex items-center justify-center rounded-full transition-transform duration-200 group-active:scale-90 motion-reduce:transition-none',
                        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9')}>
                        <Minus className={size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={2.75} />
                    </span>
                </button>
                <span aria-live="polite" className="min-w-5 text-center text-[15px] font-extrabold tabular-nums text-[var(--site-accent-text)]">
                    <span className="sr-only">Sepette </span>{quantity}<span className="sr-only"> adet</span>
                </span>
                {onAdd ? <AddButton label={`${name} bir adet ekle`} onClick={onAdd} size={size} /> : <span className="w-3" aria-hidden="true" />}
            </span>
        );
    }
    if (!onAdd) return quantity > 0 ? <span className="relative z-10"><QuantityTag quantity={quantity} /></span> : null;
    return (
        <span className="relative z-10 flex items-center">
            <AddButton label={`${name} sepete ekle`} onClick={onAdd} size={size} />
        </span>
    );
}

/**
 * Büyük kart (Öne Çıkanlar, Popüler, Menüler, kategori ızgarası): fotoğraf (rozet), ad, iki satır kısa açıklama, fiyat,
 * "+". Karta dokununca ayrıntı açılır. wide: iki sütunu kaplayan kart (tek sayılı bölümün ilki).
 */
export function ItemCard({ item, quantity, onOpen, onAdd, onRemove, wide = false, showFeaturedBadge = true, eager = false }: ItemProps & {
    wide?: boolean; showFeaturedBadge?: boolean; eager?: boolean;
}) {
    const badge = itemBadge(item, showFeaturedBadge);
    return (
        <article className={cn(card, 'relative flex flex-col overflow-hidden', item.soldOut && 'opacity-70')}>
            <div className="relative">
                <QrImage src={item.imageUrl} alt="" category={itemCategory(item)} eager={eager} className={wide ? 'aspect-[16/9]' : 'aspect-[4/3]'} />
                {item.isStockImage && item.imageUrl && <StockImageLabel className="bottom-1.5 left-1.5 right-auto" />}
                {badge && <span className="absolute left-2 top-2">{badge}</span>}
            </div>
            <div className="flex flex-1 flex-col gap-1 px-3 pb-2.5 pt-2.5">
                <h3 className={cn('m-0 line-clamp-2 font-extrabold leading-snug', wide ? 'text-[17px]' : 'text-[15px]')}>
                    {/* Kartın tamamı ayrıntıyı açar; "+" bunun üstünde kendi düğmesi. */}
                    <button type="button" onClick={onOpen} className={cn('text-left after:absolute after:inset-0 after:content-[""]', focusRing, 'focus-visible:ring-offset-0')}>
                        {item.name}
                    </button>
                </h3>
                {item.description && <p className="m-0 line-clamp-2 text-[13px] leading-snug text-[var(--site-sub)]">{item.description}</p>}
                <div className="mt-auto flex items-end justify-between gap-2 pt-1">
                    <span className="flex min-w-0 flex-col">
                        <RegularPrice item={item} />
                        <Price value={item.price} className="text-[16px]" />
                    </span>
                    <CardQuantityControl name={item.name} quantity={quantity} onAdd={onAdd} onRemove={onRemove} />
                </div>
            </div>
        </article>
    );
}

/** Liste satırı (menünün tamamı): küçük görsel, ad, açıklama, fiyat, "+". */
export function ItemRow({ item, quantity, onOpen, onAdd, onRemove }: ItemProps) {
    return (
        <article className={cn('relative flex items-center gap-3 py-2.5', item.soldOut && 'opacity-70')}>
            <div className="relative shrink-0">
                <QrImage src={item.imageUrl} alt="" category={itemCategory(item)} className="h-[68px] w-[76px] rounded-xl" />
                {item.soldOut && (
                    <span className="absolute inset-x-1 bottom-1 rounded-md bg-[var(--site-text)] py-0.5 text-center text-[11px] font-bold text-[var(--site-bg)]">Tükendi</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <h3 className="m-0 text-[15px] font-extrabold leading-snug">
                    <button type="button" onClick={onOpen} className={cn('text-left after:absolute after:inset-0 after:content-[""]', focusRing, 'focus-visible:ring-offset-0')}>
                        {item.name}
                    </button>
                    {item.featured && !item.soldOut && (
                        <Star className="mb-0.5 ml-1.5 inline h-3.5 w-3.5 fill-current text-[var(--site-accent-text)]" aria-label="Öne çıkan" />
                    )}
                </h3>
                {item.description && <p className="m-0 mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--site-sub)]">{item.description}</p>}
            </div>
            {/* Fiyat üstte, ekleme/adet seçici altında: dar ekranda adın yeri daralmasın. */}
            <div className="relative z-10 flex shrink-0 flex-col items-end gap-1">
                <span className="flex flex-col items-end">
                    <RegularPrice item={item} />
                    <Price value={item.price} className="text-[15px]" />
                </span>
                <CardQuantityControl name={item.name} quantity={quantity} onAdd={onAdd} onRemove={onRemove} size="sm" />
            </div>
        </article>
    );
}

function QuantityTag({ quantity }: { quantity: number }) {
    return (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--site-accent-soft)] px-1.5 text-xs font-extrabold tabular-nums text-[var(--site-accent-text)]">
            <span className="sr-only">Sepette </span>{quantity}<span className="sr-only"> adet</span>
        </span>
    );
}

/** Bölüm başlığı: simge, ad, sağda "Tümünü gör". */
export function SectionHeader({ id, icon, title, onSeeAll, seeAllLabel = 'Tümünü Gör' }: {
    id: string; icon?: ReactNode; title: string; onSeeAll?: () => void; seeAllLabel?: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <h2 id={id} className={cn(sectionTitle, 'flex min-w-0 items-center gap-2')}>
                {icon && <span aria-hidden="true" className="shrink-0 text-[var(--site-accent-text)]">{icon}</span>}
                <span className="min-w-0 truncate">{title}</span>
            </h2>
            {onSeeAll && (
                <button type="button" onClick={onSeeAll}
                    className={cn('-mr-2 flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 text-[13px] font-bold text-[var(--site-accent-text)]', focusRing)}>
                    {seeAllLabel}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}

/**
 * "Paket olsun" anahtarı: kalem masada değil, paketlenip verilir (garson, kasa ve mutfakta "PAKET" yazar).
 * Ürün ayrıntısında açıklamalı satır (en az 44 px). Sepet satırı kendi görünür "Paket olsun" kutusunu kullanır (QrCart).
 */
export function TakeawayToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    const input = <input type="checkbox" role="switch" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />;
    const track = (
        <span aria-hidden="true" className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors',
            checked ? 'bg-[var(--site-accent)]' : 'bg-[var(--site-border-strong)]')}>
            <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-[var(--site-card)] shadow transition-[left] motion-reduce:transition-none',
                checked ? 'left-[22px]' : 'left-0.5')} />
        </span>
    );
    return (
        <label className={cn('flex min-h-[64px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--site-focus)]',
            checked ? 'border-[var(--site-accent)] bg-[var(--site-accent-soft)]' : 'border-[var(--site-border-mid)] bg-[var(--site-card)]')}>
            {input}
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-accent-soft)] text-[var(--site-accent-text)]">
                <Package className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-extrabold leading-tight">Paket olsun</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-[var(--site-sub)]">Masaya servis edilmez, paketlenip size verilir.</span>
            </span>
            {track}
        </label>
    );
}
