import { useState } from 'react';
import type { SetMenu } from '@/features/setMenus/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { choiceSlots, isComplete, presetSelections, setUnitPrice, type Selections, type SetCartLine } from '../setMenuCart';
import BottomSheet from './BottomSheet';

interface Props {
    setMenu: SetMenu;
    /** Düzenlenen sepet satırı; null ise yeni satır eklenir. */
    line: SetCartLine | null;
    /** Düzenlemede her değişiklik hemen satıra yazılır. */
    onChange: (selections: Selections, note: string) => void;
    /** Yeni satır: seçimler tamamlanınca sepete ekler. */
    onAdd: (selections: Selections, note: string) => void;
    onClose: () => void;
}

// Menü seçim penceresi (alttan). Sabit bölümler yalnızca gösterilir; seçmeli bölümlerde seçenekler büyük
// düğmelerdir, ek ücret "+₺10" olarak yazar, satış dışı ürün seçilemez.
// Menüde tek seçmeli bölüm varsa seçime dokunmak yeter: pencere kapanır (yeni satırsa sepete eklenir).
export default function SetMenuSheet({ setMenu, line, onChange, onAdd, onClose }: Props) {
    const [selections, setSelections] = useState<Selections>(() => line?.selections ?? presetSelections(setMenu));
    const [note, setNote] = useState(line?.note ?? '');
    const slots = choiceSlots(setMenu);
    const fixedNames = setMenu.slots.filter(slot => slot.isFixed).map(slot => slot.options[0]?.productName);
    const complete = isComplete(setMenu, selections);

    const pick = (slotId: string, productId: string) => {
        const next = { ...selections, [slotId]: productId };
        setSelections(next);
        if (line) onChange(next, note);
        if (slots.length === 1) {
            if (!line) onAdd(next, note);
            onClose();
        }
    };

    const changeNote = (text: string) => {
        setNote(text);
        if (line) onChange(selections, text);
    };

    const confirm = () => {
        if (!line) onAdd(selections, note);
        onClose();
    };

    return (
        <BottomSheet
            label={`${setMenu.name} seçimleri`}
            onClose={onClose}
            footer={(
                <button
                    type="button"
                    onClick={confirm}
                    disabled={!line && !complete}
                    className="flex h-14 w-full items-center justify-between rounded-2xl bg-foreground px-5 text-[17px] font-bold text-background disabled:opacity-50"
                >
                    <span>{line ? 'Tamam' : complete ? 'Sepete ekle' : 'Seçim yapın'}</span>
                    <span>₺{formatPrice(setUnitPrice(setMenu, selections))}</span>
                </button>
            )}
        >
            <div className="flex flex-col gap-4 px-1.5 pb-1">
                <div>
                    <h3 className="font-serif text-[24px] font-bold leading-tight text-foreground">{setMenu.name}</h3>
                    {fixedNames.length > 0 && <p className="text-sm text-rb-text-sub">İçinde: {fixedNames.join(' · ')}</p>}
                </div>

                {slots.map(slot => (
                    <fieldset key={slot.id} className="flex flex-col gap-2">
                        <legend className="mb-2 text-[13px] font-bold text-rb-text-sub">{slot.name}</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {slot.options.map(option => {
                                const selected = selections[slot.id] === option.productId;
                                return (
                                    <button
                                        key={option.productId}
                                        type="button"
                                        aria-pressed={selected}
                                        disabled={!option.isProductActive}
                                        onClick={() => pick(slot.id, option.productId)}
                                        className={cn(
                                            'flex min-h-14 flex-col items-start justify-center rounded-2xl border px-3.5 py-2 text-left disabled:opacity-40',
                                            selected ? 'border-[1.5px] border-rb-gold bg-rb-gold-bg' : 'border-border bg-background',
                                        )}
                                    >
                                        <span className="text-base font-semibold text-foreground">{option.productName}</span>
                                        {!option.isProductActive ? (
                                            <span className="text-[13px] text-rb-text-sub">satış dışı</span>
                                        ) : option.surcharge > 0 && (
                                            <span className="text-[13px] font-semibold text-rb-text-sub">+₺{formatPrice(option.surcharge)}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                ))}

                <input
                    value={note}
                    onChange={e => changeNote(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    maxLength={200}
                    placeholder="Not yaz (ör. acısız)"
                    aria-label={`${setMenu.name} notu`}
                    className="h-12 w-full rounded-full border border-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-rb-gold"
                />
            </div>
        </BottomSheet>
    );
}
