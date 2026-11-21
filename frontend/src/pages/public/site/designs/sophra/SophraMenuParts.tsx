import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { DeliveryCartLine } from '@/features/delivery/deliveryCart';
import type { DeliveryQuote, OnlineSetMenu } from '@/features/delivery/types';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../../../components/StockImageLabel';
import { ImageSlot } from '../../SiteChrome';
import { serif } from '../../siteParts';
import { formatSitePrice } from '../../siteTheme';
import { MinusGlyph, PlusGlyph } from './SophraIcons';
import { spButton, spCard } from './sophraParts';
import type { ItemDraft, MenuItem, MenuTag } from './sophraMenuModel';
import { draftUnitPrice } from './sophraMenuModel';

// Sophra menü sayfasının parçaları: ürün kartı ve satırı, ürün/menü detayı (masaüstünde geniş pencere, telefonda alttan),
// sepet paneli ve satırları. Renkler yalnız --site-* değişkenlerinden.

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-focus)] focus-visible:ring-offset-2';
const roundBtn = cn('flex shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:opacity-40', focusRing);

const TAG_LABEL: Record<MenuTag, string> = { featured: 'Önerilen', new: 'Yeni', popular: 'Popüler' };

function Tags({ tags, soldOut, className }: { tags: MenuTag[]; soldOut: boolean; className?: string }) {
    if (!soldOut && tags.length === 0) return null;
    return (
        <span className={cn('flex flex-wrap gap-1.5', className)}>
            {soldOut && <span className="rounded-full bg-[var(--site-paper)] px-2.5 py-1 text-[12px] font-bold text-[var(--site-on-paper)]">Tükendi</span>}
            {!soldOut && tags.map(t => (
                <span key={t} className={cn('rounded-full px-2.5 py-1 text-[12px] font-bold',
                    t === 'new' ? 'bg-[var(--site-mustard)] text-[var(--site-paper)]' : 'bg-[var(--site-card)] text-[var(--site-accent-text)] ring-1 ring-[var(--site-border)]')}>
                    {TAG_LABEL[t]}
                </span>
            ))}
        </span>
    );
}

/** Kartın/satırın sağ altındaki ekleme: sepette varsa adet, yoksa +. Sipariş yoksa "Detay" oku yok: yalnız kart tıklanır. */
function AddControl({ item, quantity, canAdd, onAdd, onRemove }: { item: MenuItem; quantity: number; canAdd: boolean; onAdd: () => void; onRemove: () => void }) {
    if (!canAdd) return null;
    if (quantity > 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--site-alt)] p-0.5">
                <button type="button" onClick={onRemove} aria-label={`${item.name}: bir azalt`} className={cn(roundBtn, 'h-10 w-10 text-[var(--site-text)]')}><MinusGlyph className="h-4 w-4" /></button>
                <span className="min-w-5 text-center font-bold tabular-nums"><span className="sr-only">Sepette </span>{quantity}</span>
                <button type="button" onClick={onAdd} aria-label={`${item.name}: bir artır`} className={cn(roundBtn, 'h-10 w-10 bg-[var(--site-accent)] text-[var(--site-on-accent)]')}><PlusGlyph className="h-4 w-4" /></button>
            </span>
        );
    }
    return (
        <button type="button" onClick={onAdd} aria-label={`${item.name} sepete ekle`} className={cn(roundBtn, 'h-11 w-11 bg-[var(--site-accent)] text-[var(--site-on-accent)]')}>
            <PlusGlyph />
        </button>
    );
}

interface ItemViewProps {
    item: MenuItem;
    restaurant: string;
    quantity: number;
    canAdd: boolean;
    onOpen: () => void;
    onAdd: () => void;
    onRemove: () => void;
}

/** Görsel kart: fotoğraf, etiket, ad, iki satır açıklama, fiyat ve +. Karta tıklanınca detay açılır. */
export function ItemCard({ item, restaurant, quantity, canAdd, onOpen, onAdd, onRemove }: ItemViewProps) {
    return (
        <article className={cn(spCard, 'flex h-full flex-col overflow-hidden', item.soldOut && 'opacity-70')}>
            <button type="button" onClick={onOpen} className={cn('group relative block text-left', focusRing)} aria-label={`${item.name}, ayrıntılar`}>
                <ImageSlot src={item.imageUrl} alt="" restaurant={restaurant} className="aspect-[4/3]" />
                {item.isStockImage && item.imageUrl && <StockImageLabel />}
                <Tags tags={item.tags} soldOut={item.soldOut} className="absolute left-3 top-3" />
            </button>
            <div className="flex flex-1 flex-col gap-1.5 p-4 pb-3">
                <h3 className="m-0 text-[17px] font-bold leading-snug">
                    <button type="button" onClick={onOpen} className={cn('text-left hover:underline', focusRing)}>{item.name}</button>
                </h3>
                {item.description && <p className="m-0 line-clamp-2 text-[14px] leading-snug text-[var(--site-sub)]">{item.description}</p>}
                {item.kind === 'setMenu' && item.contents && <p className="m-0 line-clamp-2 text-[13px] text-[var(--site-muted)]">{item.contents}</p>}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 pb-4">
                <span className="flex items-baseline gap-2">
                    <span className={cn(serif, 'whitespace-nowrap text-[22px] leading-none tabular-nums')}>{formatSitePrice(item.price)}</span>
                    {item.regularPrice && <s className="text-[13px] tabular-nums text-[var(--site-muted)]"><span className="sr-only">Normal fiyatı </span>{formatSitePrice(item.regularPrice)}</s>}
                </span>
                <AddControl item={item} quantity={quantity} canAdd={canAdd} onAdd={onAdd} onRemove={onRemove} />
            </div>
        </article>
    );
}

/** Sıkı satır: ad (etiketle), tek satır açıklama, fiyat ve +. */
export function ItemRow({ item, quantity, canAdd, onOpen, onAdd, onRemove }: Omit<ItemViewProps, 'restaurant'>) {
    return (
        <div className={cn('flex items-center gap-3 py-3.5', item.soldOut && 'opacity-70')}>
            <button type="button" onClick={onOpen} className={cn('flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left', focusRing)}>
                <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-bold leading-snug">{item.name}</span>
                    <Tags tags={item.tags.slice(0, 1)} soldOut={item.soldOut} />
                </span>
                {(item.description || item.contents) && <span className="line-clamp-1 text-[14px] text-[var(--site-sub)]">{item.description || item.contents}</span>}
            </button>
            <span className="flex shrink-0 flex-col items-end">
                <span className={cn(serif, 'whitespace-nowrap text-[19px] leading-none tabular-nums')}>{formatSitePrice(item.price)}</span>
                {item.regularPrice && <s className="mt-1 text-[12px] tabular-nums text-[var(--site-muted)]">{formatSitePrice(item.regularPrice)}</s>}
            </span>
            <AddControl item={item} quantity={quantity} canAdd={canAdd} onAdd={onAdd} onRemove={onRemove} />
        </div>
    );
}

// ── Pencere ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Sophra penceresi: telefonda alttan açılan tam genişlik sayfa, masaüstünde ortada geniş pencere. Portal yok (sitenin renk
 * değişkenleri kök kutuda). Escape ve arka plan kapatır; açıkken sayfa kaymaz; odak pencereye gider, kapanınca geri döner.
 */
export function SpModal({ title, onClose, wide = false, footer, children, locked = false }: {
    title: string; onClose: () => void; wide?: boolean; footer?: ReactNode; children: ReactNode; locked?: boolean;
}) {
    const titleId = useId();
    const panel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !locked) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, locked]);
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const opener = document.activeElement as HTMLElement | null;
        panel.current?.focus();
        return () => { document.body.style.overflow = previous; opener?.focus?.(); };
    }, []);
    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-[color-mix(in_srgb,var(--site-paper)_62%,transparent)] sm:items-center sm:justify-center sm:p-6"
            onClick={() => { if (!locked) onClose(); }}>
            <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={e => e.stopPropagation()}
                className={cn('flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--site-card)] text-[var(--site-text)] outline-none animate-in slide-in-from-bottom duration-200 sm:rounded-[28px]',
                    wide ? 'sm:max-w-[880px]' : 'sm:max-w-[520px]')}>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--site-border)] px-5 py-3.5 sm:px-6">
                    <h2 id={titleId} className={cn(serif, 'm-0 min-w-0 truncate text-[24px] leading-tight')}>{title}</h2>
                    <button type="button" onClick={onClose} disabled={locked} aria-label="Kapat"
                        className={cn(roundBtn, 'h-11 w-11 border border-[var(--site-border)] text-[var(--site-text)]')}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                {footer && <div className="shrink-0 border-t border-[var(--site-border)] bg-[var(--site-card)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
            </div>
        </div>
    );
}

// ── Ürün / menü detayı ──────────────────────────────────────────────────────────────────────────

/**
 * Detay: fotoğraf, ad, açıklama, taban fiyat; hazır menüde bölüm bölüm seçim (zorunlu radyo, fiyat farkı); not, adet ve
 * canlı toplam. Seçimler sayfanın taslağında tutulur (kapatıp açınca korunur, sepete eklenince sıfırlanır). Ürün seçenek
 * grupları (porsiyon, ekstra; Aşama C) geldiğinde `groups` aynı radyo düzeniyle çizilir.
 */
export function ItemDetail({ item, restaurant, draft, canAdd, closedNote, onDraft, onAdd, onClose }: {
    item: MenuItem; restaurant: string; draft: ItemDraft; canAdd: boolean; closedNote: string | null;
    onDraft: (next: ItemDraft) => void; onAdd: () => void; onClose: () => void;
}) {
    const menu = item.setMenu;
    const unit = draftUnitPrice(item, draft);
    const complete = !menu || menu.slots.every(s => draft.selections[s.id]);
    const footer = canAdd ? (
        <div className="flex items-center gap-3">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-alt)] p-0.5">
                <button type="button" onClick={() => onDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })} aria-label="Adedi azalt" className={cn(roundBtn, 'h-11 w-11')}><MinusGlyph className="h-4 w-4" /></button>
                <span className="min-w-6 text-center text-[17px] font-bold tabular-nums" aria-live="polite">{draft.quantity}</span>
                <button type="button" onClick={() => onDraft({ ...draft, quantity: Math.min(50, draft.quantity + 1) })} aria-label="Adedi artır" className={cn(roundBtn, 'h-11 w-11')}><PlusGlyph className="h-4 w-4" /></button>
            </span>
            <button type="button" disabled={!complete || item.soldOut} onClick={onAdd}
                className={cn(spButton.accent, 'min-h-[56px] flex-1 justify-between px-6 disabled:opacity-50')}>
                <span>{item.soldOut ? 'Tükendi' : 'Sepete ekle'}</span>
                <span className="tabular-nums">{formatSitePrice(unit * draft.quantity)}</span>
            </button>
        </div>
    ) : closedNote ? <p className="m-0 text-center text-[15px] text-[var(--site-sub)]">{closedNote}</p> : undefined;

    return (
        <SpModal title={item.name} onClose={onClose} wide footer={footer}>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="relative bg-[var(--site-alt)] sm:min-h-full">
                    <ImageSlot src={item.imageUrl} alt={item.name} restaurant={restaurant} className="aspect-[4/3] sm:aspect-auto sm:h-full sm:min-h-[340px]" />
                    {item.isStockImage && item.imageUrl && <StockImageLabel />}
                    <Tags tags={item.tags} soldOut={item.soldOut} className="absolute left-4 top-4" />
                </div>
                <div className="flex flex-col gap-5 p-5 sm:p-6">
                    <div className="flex flex-col gap-2">
                        <span className="flex items-baseline gap-2">
                            <span className={cn(serif, 'text-[30px] leading-none tabular-nums')}>{formatSitePrice(item.price)}</span>
                            {item.regularPrice && <s className="text-[15px] tabular-nums text-[var(--site-muted)]">{formatSitePrice(item.regularPrice)}</s>}
                        </span>
                        {item.description && <p className="m-0 text-[16px] leading-relaxed text-[var(--site-sub)]">{item.description}</p>}
                    </div>
                    {menu && <SlotChoices menu={menu} selections={draft.selections} disabled={!canAdd}
                        onPick={(slotId, productId) => onDraft({ ...draft, selections: { ...draft.selections, [slotId]: productId } })} />}
                    {canAdd && (
                        <label className="flex flex-col gap-1.5">
                            <span className="text-[14px] font-bold">Not <span className="font-normal text-[var(--site-muted)]">(isteğe bağlı)</span></span>
                            <input value={draft.note} onChange={e => onDraft({ ...draft, note: e.target.value })} maxLength={300} placeholder="ör. soğansız, az acılı"
                                className="h-12 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3.5 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-focus)]" />
                            <span className="text-[13px] text-[var(--site-muted)]">Farklı notlu aynı ürün sepette ayrı satır olur.</span>
                        </label>
                    )}
                </div>
            </div>
        </SpModal>
    );
}

function SlotChoices({ menu, selections, disabled, onPick }: {
    menu: OnlineSetMenu; selections: Record<string, string>; disabled: boolean; onPick: (slotId: string, productId: string) => void;
}) {
    return (
        <div className="flex flex-col gap-4">
            {menu.slots.map(slot => {
                const fixed = slot.isFixed || slot.options.length === 1;
                if (fixed) {
                    return (
                        <div key={slot.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--site-alt)] px-4 py-3">
                            <span className="min-w-0">
                                <span className="block text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--site-muted)]">{slot.name}</span>
                                <span className="block text-[15px] font-semibold">{slot.options[0]?.productName ?? '—'}</span>
                            </span>
                            <span className="text-[13px] text-[var(--site-sub)]">Menüde</span>
                        </div>
                    );
                }
                return (
                    <fieldset key={slot.id} className="m-0 border-0 p-0">
                        <legend className="mb-2 flex w-full items-center justify-between gap-3">
                            <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--site-muted)]">{slot.name}</span>
                            <span className="rounded-full bg-[var(--site-alt)] px-2.5 py-0.5 text-[12px] font-bold">Zorunlu · birini seçin</span>
                        </legend>
                        <div role="radiogroup" aria-label={slot.name} className="flex flex-col gap-2">
                            {slot.options.map(o => {
                                const on = selections[slot.id] === o.productId;
                                return (
                                    <button key={o.productId} type="button" role="radio" aria-checked={on} disabled={disabled || !o.isAvailable}
                                        onClick={() => onPick(slot.id, o.productId)}
                                        className={cn('flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left transition-colors disabled:opacity-50', focusRing,
                                            on ? 'border-[var(--site-accent)] bg-[var(--site-alt)]' : 'border-[var(--site-border-strong)] hover:border-[var(--site-text)]')}>
                                        <span aria-hidden="true" className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-[var(--site-accent)]' : 'border-[var(--site-border-strong)]')}>
                                            {on && <span className="h-2.5 w-2.5 rounded-full bg-[var(--site-accent)]" />}
                                        </span>
                                        <span className="min-w-0 flex-1 text-[15px] font-semibold">{o.productName}</span>
                                        <span className="shrink-0 text-[14px] tabular-nums text-[var(--site-sub)]">
                                            {!o.isAvailable ? 'Tükendi' : o.surcharge > 0 ? `+${formatSitePrice(o.surcharge)}` : ''}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                );
            })}
        </div>
    );
}

// ── Sepet ───────────────────────────────────────────────────────────────────────────────────────

export interface CartImage { src: string; stock: boolean }

/** Sepet satırları: küçük görsel, ad, seçimler ve not, adet, birim ve satır tutarı (sunucu teklifi varsa ondan), sil. */
export function CartLineList({ lines, quote, restaurant, imageOf, onChange, onRemove }: {
    lines: DeliveryCartLine[]; quote: DeliveryQuote | null; restaurant: string; imageOf: (line: DeliveryCartLine) => CartImage;
    onChange: (key: string, delta: number) => void; onRemove: (key: string) => void;
}) {
    return (
        <ul className="m-0 flex list-none flex-col divide-y divide-[var(--site-border)] p-0">
            {[...lines].reverse().map(line => {
                const index = lines.indexOf(line);
                const q = quote?.lines[index];
                const unit = q?.unitPrice ?? line.unitPrice;
                const total = q?.lineTotal ?? unit * line.quantity;
                const img = imageOf(line);
                return (
                    <li key={line.key} className="flex gap-3 py-3">
                        <ImageSlot src={img.src} alt="" restaurant={restaurant} className="h-14 w-14 shrink-0 rounded-xl" logoTextClassName="text-[10px]" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-[15px] font-bold leading-snug">{line.name}</span>
                                <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatSitePrice(total)}</span>
                            </div>
                            {line.selectionNames.length > 0 && <span className="text-[13px] leading-snug text-[var(--site-sub)]">{line.selectionNames.join(', ')}</span>}
                            {line.note && <span className="text-[13px] italic text-[var(--site-sub)]">Not: {line.note}</span>}
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--site-alt)] p-0.5">
                                    <button type="button" onClick={() => onChange(line.key, -1)} aria-label={`${line.name}: bir azalt`} className={cn(roundBtn, 'h-9 w-9')}><MinusGlyph className="h-3.5 w-3.5" /></button>
                                    <span className="min-w-5 text-center text-[14px] font-bold tabular-nums">{line.quantity}</span>
                                    <button type="button" onClick={() => onChange(line.key, 1)} aria-label={`${line.name}: bir artır`} className={cn(roundBtn, 'h-9 w-9')}><PlusGlyph className="h-3.5 w-3.5" /></button>
                                </span>
                                <span className="flex items-center gap-3">
                                    {line.quantity > 1 && <span className="text-[12px] tabular-nums text-[var(--site-muted)]">Adet {formatSitePrice(unit)}</span>}
                                    <button type="button" onClick={() => onRemove(line.key)} className={cn('min-h-9 text-[13px] font-semibold text-[var(--site-sub)] underline underline-offset-2 hover:text-[var(--site-text)]', focusRing)}>Kaldır</button>
                                </span>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export interface CartSummary {
    subtotal: number;
    /** null: mahalle seçilmedi (adrese teslim). */
    fee: number | null;
    pickup: boolean;
    zoneName: string | null;
    total: number;
}

/** Ara toplam, teslimat, toplam (hazır menü indirimi fiyata dahil; kupon yok). */
export function CartTotalsBlock({ summary }: { summary: CartSummary }) {
    return (
        <dl className="m-0 flex flex-col gap-1.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-[var(--site-sub)]">Ara toplam</dt><dd className="m-0 tabular-nums">{formatSitePrice(summary.subtotal)}</dd></div>
            <div className="flex justify-between gap-3">
                <dt className="text-[var(--site-sub)]">{summary.pickup ? 'Gel al' : `Teslimat${summary.zoneName ? ` (${summary.zoneName})` : ''}`}</dt>
                <dd className="m-0 tabular-nums">{summary.pickup ? 'Ücretsiz' : summary.fee === null ? 'Mahalle seçilince' : summary.fee > 0 ? formatSitePrice(summary.fee) : 'Ücretsiz'}</dd>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between border-t border-dashed border-[var(--site-border-strong)] pt-2.5">
                <dt className="font-bold">Toplam</dt>
                <dd className={cn(serif, 'm-0 text-[28px] leading-none tabular-nums')}>{formatSitePrice(summary.total)}</dd>
            </div>
        </dl>
    );
}
