import { Minus, Plus, UtensilsCrossed } from 'lucide-react';
import type { SetMenu } from '@/features/setMenus/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { choiceSlots, setLineSummary, type SetCartLine } from '../setMenuCart';

interface Props {
    setMenu: SetMenu;
    /** Bu menünün sepet satırları (boşsa menü sepette değil). */
    lines: SetCartLine[];
    onAdd: () => void;
    onRemove: () => void;
    /** "Değiştir": satırın seçimlerini ve notunu düzenleme penceresi. */
    onEdit: (lineId: string) => void;
    /** Aynı menüden farklı seçimli yeni bir satır (ör. 1 Ayranlı + 1 Kolalı). */
    onAddDifferent: () => void;
}

// Ürün ekleme listesinde bir menü ("Adana Menü"). ProductRow ile aynı davranış: satırın tamamı "ekle"
// düğmesidir, sepetteyken sağda −/+ çıkar. Sepetteki her satır altta seçimleriyle ("1× Ayran") ve
// "Değiştir" düğmesiyle listelenir.
export default function SetMenuRow({ setMenu, lines, onAdd, onRemove, onEdit, onAddDifferent }: Props) {
    const qty = lines.reduce((sum, l) => sum + l.quantity, 0);
    const inCart = qty > 0;
    const hasChoices = choiceSlots(setMenu).length > 0;
    // "Adana Kebap + İçecek + Patates": sabit bölümde ürün, seçmeli bölümde bölümün adı.
    const contents = setMenu.slots.map(slot => (slot.isFixed ? slot.options[0]?.productName : slot.name)).join(' + ');

    return (
        <li className={cn('flex flex-col gap-2 rounded-2xl bg-card p-2.5', inCart ? 'border-[1.5px] border-rb-gold' : 'border border-border')}>
            <div className="relative flex items-center gap-3">
                <button
                    type="button"
                    onClick={onAdd}
                    aria-label={inCart ? `${setMenu.name} bir tane daha ekle` : `${setMenu.name} ekle`}
                    className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-foreground/5"
                />
                {setMenu.imageUrl ? (
                    <img src={setMenu.imageUrl} alt="" loading="lazy" className="size-13 shrink-0 rounded-[14px] object-cover" />
                ) : (
                    <span className="flex size-13 shrink-0 items-center justify-center rounded-[14px] bg-rb-gold-bg text-rb-gold" aria-hidden="true">
                        <UtensilsCrossed className="size-6" />
                    </span>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-semibold text-foreground">{setMenu.name}</span>
                    <div className="flex h-8 min-w-0 items-center gap-2 text-sm text-rb-text-sub">
                        <span className="shrink-0 font-bold text-foreground">{formatPrice(setMenu.price)} ₺</span>
                        <span className="truncate">· {contents}</span>
                    </div>
                </div>
                {inCart ? (
                    <div className="relative flex shrink-0 items-center rounded-full bg-muted">
                        <button
                            type="button"
                            onClick={onRemove}
                            aria-label={`${setMenu.name} azalt`}
                            className="flex size-12 items-center justify-center rounded-full bg-card text-foreground"
                        >
                            <Minus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                        </button>
                        <span aria-live="polite" className="w-7 text-center text-base font-bold tabular-nums">{qty}</span>
                        <button
                            type="button"
                            onClick={onAdd}
                            aria-label={`${setMenu.name} ekle`}
                            className="flex size-12 items-center justify-center rounded-full bg-foreground text-background"
                        >
                            <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rb-gold text-rb-gold-foreground" aria-hidden="true">
                        <Plus className="size-5.5" strokeWidth={2.4} />
                    </span>
                )}
            </div>
            {inCart && (
                <div className="flex flex-col gap-1.5 border-t border-border pt-2">
                    {lines.map(line => (
                        <div key={line.id} className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                <span className="font-bold tabular-nums">{line.quantity}×</span>{' '}
                                {setLineSummary(setMenu, line) || 'Notsuz'}
                            </span>
                            <button
                                type="button"
                                onClick={() => onEdit(line.id)}
                                className="min-h-11 shrink-0 rounded-full border border-rb-gold/50 bg-rb-gold-bg px-3.5 text-sm font-bold text-rb-gold"
                            >
                                {hasChoices ? 'Değiştir' : 'Not'}
                            </button>
                        </div>
                    ))}
                    {hasChoices && (
                        <button
                            type="button"
                            onClick={onAddDifferent}
                            className="min-h-11 self-start rounded-full border border-dashed border-border px-4 text-sm font-semibold text-rb-text-sub"
                        >
                            + Farklı seçimle 1 tane daha
                        </button>
                    )}
                </div>
            )}
        </li>
    );
}
