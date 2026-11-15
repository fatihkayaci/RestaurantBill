import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { defaultSelections, setMenuUnitPrice } from '@/features/delivery/deliveryCart';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { headingFont } from '../site/siteTheme';
import Sheet from './Sheet';

interface Props {
    menu: OnlineSetMenu;
    onClose: () => void;
    onAdd: (selections: Record<string, string>, quantity: number, note: string) => void;
}

// Menü (set) seçimi: her bölümde bir seçenek (varsayılan seçili), seçim farkı fiyata eklenir. Tek seçenekli bölümler
// "menüde" olarak yazılır. Tükenen seçenek seçilemez. Garson ekranındaki SetMenuSheet'in müşteri sitesi karşılığı.
export default function DeliverySetMenuSheet({ menu, onClose, onAdd }: Props) {
    const [selections, setSelections] = useState<Record<string, string>>(() => defaultSelections(menu));
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');

    const unitPrice = setMenuUnitPrice(menu, selections);
    const complete = menu.slots.every(slot => selections[slot.id]);

    const footer = (
        <div className="flex items-center gap-3">
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-raised)] p-0.5">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Bir azalt"
                    className="flex h-11 w-11 items-center justify-center rounded-full"><Minus className="h-4 w-4" aria-hidden="true" /></button>
                <span className="min-w-5 text-center text-base font-bold" aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity(q => Math.min(50, q + 1))} aria-label="Bir artır"
                    className="flex h-11 w-11 items-center justify-center rounded-full"><Plus className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <button
                type="button"
                disabled={!complete}
                onClick={() => onAdd(selections, quantity, note.trim())}
                className="flex h-14 flex-1 items-center justify-between rounded-full bg-[var(--site-accent)] px-5 text-[var(--site-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                <span className="text-base font-semibold">Sepete ekle</span>
                <span className={cn(headingFont, 'text-lg font-bold tabular-nums')}>{formatPrice(unitPrice * quantity)} ₺</span>
            </button>
        </div>
    );

    return (
        <Sheet title={menu.name} onClose={onClose} footer={footer}>
            {menu.description?.trim() && <p className="mb-3 text-sm text-[var(--site-sub)]">{menu.description}</p>}
            <div className="flex flex-col gap-5">
                {menu.slots.map(slot => {
                    const single = slot.isFixed || slot.options.length === 1;
                    if (single) {
                        const option = slot.options[0];
                        return (
                            <div key={slot.id}>
                                <p className="text-xs font-bold uppercase tracking-widest text-[var(--site-sub)]">{slot.name}</p>
                                <p className="mt-1 text-[15px] font-semibold">{option?.productName ?? '—'} <span className="font-normal text-[var(--site-sub)]">· menüde</span></p>
                            </div>
                        );
                    }
                    return (
                        <fieldset key={slot.id}>
                            <legend className="text-xs font-bold uppercase tracking-widest text-[var(--site-sub)]">{slot.name}</legend>
                            <div className="mt-2 flex flex-col gap-2">
                                {slot.options.map(option => {
                                    const checked = selections[slot.id] === option.productId;
                                    return (
                                        <button
                                            key={option.productId}
                                            type="button"
                                            role="radio"
                                            aria-checked={checked}
                                            disabled={!option.isAvailable}
                                            onClick={() => setSelections(prev => ({ ...prev, [slot.id]: option.productId }))}
                                            className={cn(
                                                'flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left transition-colors disabled:opacity-50',
                                                checked ? 'border-[var(--site-accent)] bg-[var(--site-raised)]' : 'border-[var(--site-border-strong)]'
                                            )}
                                        >
                                            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                                checked ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]' : 'border-[var(--site-border-strong)]')}>
                                                {checked && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                                            </span>
                                            <span className="min-w-0 flex-1 text-[15px] font-semibold">{option.productName}</span>
                                            <span className="shrink-0 text-sm text-[var(--site-sub)]">
                                                {!option.isAvailable ? 'Tükendi' : option.surcharge > 0 ? `+${formatPrice(option.surcharge)} ₺` : ''}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>
                    );
                })}
                <label className="block">
                    <span className="text-sm font-semibold">Not</span>
                    <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="ör. soğansız"
                        className="mt-1.5 h-11 w-full rounded-xl border border-[var(--site-border-strong)] bg-[var(--site-bg)] px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]" />
                </label>
            </div>
        </Sheet>
    );
}
