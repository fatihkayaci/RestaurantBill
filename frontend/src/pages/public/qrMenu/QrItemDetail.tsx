import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, Clock, Layers, ShoppingCart, SquarePen, Star, Tag } from 'lucide-react';
import { defaultSelections, setMenuUnitPrice } from '@/features/delivery/deliveryCart';
import type { OnlineSetMenu } from '@/features/delivery/types';
import type { PublicProduct } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StockImageLabel } from '../components/StockImageLabel';
import type { QrItem } from './qrModel';
import { CategoryGlyph, QrImage, Stepper, TakeawayToggle } from './QrParts';
import { column, displayTitle, fieldClass, focusRing, overlayPage, primaryButton } from './qrUi';

interface Props {
    item: QrItem;
    onClose: () => void;
    /** null: eklenebilir; değilse alt çubukta neden yazılır (kapalı, QR siparişi kilitli, sipariş kapalı). */
    blockedReason: string | null;
    /** takeaway: "Paket olsun" (kalem paketlenip verilir). */
    onAddProduct: (product: PublicProduct, quantity: number, note: string, takeaway: boolean) => void;
    onAddSetMenu: (menu: OnlineSetMenu, selections: Record<string, string>, quantity: number, note: string, takeaway: boolean) => void;
}

// Ürün / hazır menü ayrıntısı (tam ekran): fotoğraf, ad ve fiyat, açıklama, gerçek veriden rozetler (hazırlanma süresi,
// öne çıkan, kategori, menü avantajı), hazır menüde bölüm seçimleri (radyo; seçim farkı fiyat olarak), not, adet ve
// "Paket olsun" anahtarı ve "Sepete Ekle". Ürünlerin porsiyon/ekstra seçeneği veri modelinde yok: o bölümler yalnız hazır menüde çizilir.
export default function QrItemDetail({ item, onClose, blockedReason, onAddProduct, onAddSetMenu }: Props) {
    const menu = item.menu;
    const [selections, setSelections] = useState<Record<string, string>>(() => menu ? defaultSelections(menu) : {});
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [takeaway, setTakeaway] = useState(false);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        titleRef.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
            opener?.focus?.({ preventScroll: true });
        };
    }, []);

    const unitPrice = menu ? setMenuUnitPrice(menu, selections) : item.price;
    const complete = !menu || menu.slots.every(slot => selections[slot.id]);
    const choiceSlots = menu?.slots.filter(slot => !slot.isFixed && slot.options.length > 1) ?? [];
    const fixedSlots = menu?.slots.filter(slot => slot.isFixed || slot.options.length <= 1) ?? [];

    const add = () => {
        if (blockedReason || item.soldOut || !complete) return;
        if (menu) onAddSetMenu(menu, selections, quantity, note.trim(), takeaway);
        else if (item.product) onAddProduct(item.product, quantity, note.trim(), takeaway);
    };

    const badges: { key: string; icon: ReactNode; text: string }[] = [
        ...(item.prepMinutes ? [{ key: 'prep', icon: <Clock className="h-[18px] w-[18px]" />, text: `${item.prepMinutes} dk'da hazır` }] : []),
        ...(item.featured ? [{ key: 'chef', icon: <Star className="h-[18px] w-[18px]" />, text: 'Öne çıkan' }] : []),
        ...(menu ? [{ key: 'parts', icon: <Layers className="h-[18px] w-[18px]" />, text: `${menu.slots.length} parça` }] : []),
        ...(item.regularPrice != null ? [{ key: 'save', icon: <Tag className="h-[18px] w-[18px]" />, text: `${formatPrice(item.regularPrice - item.price)} ₺ avantajlı` }] : []),
        ...(!menu && item.categoryName ? [{ key: 'cat', icon: <CategoryGlyph category={{ id: item.categoryId, name: item.categoryName }} className="h-[18px] w-[18px]" />, text: item.categoryName }] : []),
    ].slice(0, 3);

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="urun-baslik" className={overlayPage}>
            <div className={cn(column, 'flex min-h-full flex-col')}>
                <div className="relative">
                    <QrImage src={item.imageUrl} alt={item.name} category={{ id: item.categoryId, name: item.categoryName }} eager className="aspect-[4/3] max-h-[52vh] sm:rounded-b-[28px]" />
                    {item.isStockImage && item.imageUrl && <StockImageLabel className="bottom-9 right-3" />}
                    <button type="button" onClick={onClose} aria-label="Geri"
                        className={cn('absolute left-2 top-[max(0.5rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--site-card)_92%,transparent)] text-[var(--site-text)] shadow-[0_2px_10px_rgba(0,0,0,0.2)]', focusRing)}>
                        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                <div className="relative -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-[var(--site-bg)] px-5 pb-6 pt-6">
                    <div className="flex items-start justify-between gap-4">
                        <h2 id="urun-baslik" ref={titleRef} tabIndex={-1} className={cn(displayTitle, 'min-w-0 text-[28px] outline-none')}>{item.name}</h2>
                        <p className="m-0 flex shrink-0 flex-col items-end pt-1">
                            {item.regularPrice != null && (
                                <span className="text-sm font-semibold tabular-nums text-[var(--site-muted)] line-through"><span className="sr-only">Ayrı ayrı </span>{formatPrice(item.regularPrice)} ₺</span>
                            )}
                            <span className="text-[24px] font-extrabold leading-none tabular-nums text-[var(--site-accent-text)]">{formatPrice(item.price)} ₺</span>
                        </p>
                    </div>
                    {item.description && <p className="m-0 mt-2.5 text-[15px] leading-relaxed text-[var(--site-sub)]">{item.description}</p>}
                    {item.soldOut && (
                        <p role="status" className="m-0 mt-3 rounded-2xl bg-[var(--site-alt)] px-4 py-3 text-sm font-bold">Bu ürün şu an tükendi.</p>
                    )}

                    {badges.length > 0 && (
                        <ul className="m-0 mt-4 grid list-none divide-x divide-[var(--site-border)] rounded-2xl bg-[var(--site-alt)] p-0 py-3"
                            style={{ gridTemplateColumns: `repeat(${badges.length}, minmax(0, 1fr))` }}>
                            {badges.map(b => (
                                <li key={b.key} className="flex flex-col items-center gap-1 px-2 text-center text-[12px] font-semibold leading-tight">
                                    <span aria-hidden="true" className="text-[var(--site-accent-text)]">{b.icon}</span>{b.text}
                                </li>
                            ))}
                        </ul>
                    )}

                    {choiceSlots.map(slot => (
                        <fieldset key={slot.id} className="m-0 mt-6 border-0 p-0">
                            <legend className="flex items-baseline gap-2 p-0">
                                <span className="text-[17px] font-extrabold">{slot.name}</span>
                                <span className="text-sm font-semibold text-[var(--site-accent-text)]">(Zorunlu)</span>
                            </legend>
                            <div className={cn('mt-2.5 overflow-hidden rounded-2xl border border-[var(--site-border-mid)] bg-[var(--site-card)]')}>
                                {slot.options.map((option, i) => {
                                    const checked = selections[slot.id] === option.productId;
                                    return (
                                        <label key={option.productId}
                                            className={cn('relative flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-[var(--site-focus)]',
                                                i > 0 && 'border-t border-[var(--site-border)]',
                                                checked && 'bg-[var(--site-accent-soft)]',
                                                !option.isAvailable && 'cursor-not-allowed opacity-50')}>
                                            <input type="radio" name={`slot-${slot.id}`} className="sr-only" checked={checked} disabled={!option.isAvailable}
                                                onChange={() => setSelections(prev => ({ ...prev, [slot.id]: option.productId }))} />
                                            <span className="min-w-0 flex-1 text-[15px] font-semibold">{option.productName}</span>
                                            <span className="shrink-0 text-sm font-bold tabular-nums">
                                                {!option.isAvailable ? 'Tükendi' : option.surcharge > 0 ? `+${formatPrice(option.surcharge)} ₺` : <span className="font-semibold text-[var(--site-sub)]">Dahil</span>}
                                            </span>
                                            <span aria-hidden="true" className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                                                checked ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'border-[var(--site-border-strong)]')}>
                                                {checked && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>
                    ))}

                    {fixedSlots.length > 0 && (
                        <section aria-labelledby="menude-olanlar" className="mt-6">
                            <h3 id="menude-olanlar" className="m-0 text-[17px] font-extrabold">Menüde olanlar</h3>
                            <ul className="m-0 mt-2.5 list-none overflow-hidden rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] p-0">
                                {fixedSlots.map((slot, i) => (
                                    <li key={slot.id} className={cn('flex min-h-12 items-center justify-between gap-3 px-4 py-2.5', i > 0 && 'border-t border-[var(--site-border)]')}>
                                        <span className="min-w-0">
                                            <span className="block text-[15px] font-semibold">{slot.options[0]?.productName ?? slot.name}</span>
                                            <span className="block text-[13px] text-[var(--site-sub)]">{slot.name}</span>
                                        </span>
                                        <Check className="h-[18px] w-[18px] shrink-0 text-[var(--site-accent-text)]" strokeWidth={2.75} aria-label="Dahil" />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {!blockedReason && !item.soldOut && (
                        <div className="mt-6">
                            <TakeawayToggle checked={takeaway} onChange={setTakeaway} />
                        </div>
                    )}

                    {!blockedReason && !item.soldOut && (
                        <div className="mt-6">
                            <label htmlFor="urun-notu" className="flex items-baseline gap-2">
                                <span className="text-[17px] font-extrabold">Notunuz</span>
                                <span className="text-sm font-semibold text-[var(--site-sub)]">(Opsiyonel)</span>
                            </label>
                            <div className="relative mt-2.5">
                                <SquarePen className="pointer-events-none absolute left-3.5 top-3.5 h-[18px] w-[18px] text-[var(--site-muted)]" aria-hidden="true" />
                                <textarea id="urun-notu" value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={2}
                                    placeholder="Örn. soğansız, az acılı…" className={cn(fieldClass, 'resize-none py-3 pl-11')} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 z-10 border-t border-[var(--site-border)] bg-[color-mix(in_srgb,var(--site-bg)_96%,transparent)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[10px]">
                    {blockedReason ? (
                        <p role="status" className="m-0 py-2 text-center text-sm font-semibold leading-relaxed text-[var(--site-sub)]">{blockedReason}</p>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Stepper value={quantity} name={item.name} min={1} onMinus={() => setQuantity(q => Math.max(1, q - 1))} onPlus={() => setQuantity(q => Math.min(50, q + 1))} />
                            <button type="button" onClick={add} disabled={item.soldOut || !complete} className={cn(primaryButton, 'min-w-0 flex-1 justify-between')}>
                                <span className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5 shrink-0" aria-hidden="true" />
                                    {item.soldOut ? 'Tükendi' : 'Sepete Ekle'}
                                </span>
                                {!item.soldOut && <span className="tabular-nums">{formatPrice(unitPrice * quantity)} ₺</span>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
