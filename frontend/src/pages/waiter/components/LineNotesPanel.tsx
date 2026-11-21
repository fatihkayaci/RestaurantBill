import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CartLine } from '../orderCart';

export interface LineNoteActions {
    onLineQuantity: (lineId: string, delta: number) => void;
    onToggleChip: (lineId: string, chip: string) => void;
    onLineText: (lineId: string, text: string) => void;
    onAddSeparate: () => void;
}

interface Props extends LineNoteActions {
    productName: string;
    lines: CartLine[];
    quickNotes: string[];
}

// Ürün satırının "Not" paneli: her sepet satırı için hızlı not çipleri ve serbest not.
// "Ayrı notla ekle" aynı üründen farklı notlu ikinci bir satır açar (ör. 1 acılı + 1 acısız).
export default function LineNotesPanel({
    productName, lines, quickNotes, onLineQuantity, onToggleChip, onLineText, onAddSeparate,
}: Props) {
    const multiple = lines.length > 1;
    return (
        <div className="flex flex-col gap-3 border-t border-border pt-2.5">
            {lines.map((line, index) => (
                <div key={line.id} className="flex flex-col gap-2">
                    {multiple && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-rb-text-sub">{index + 1}. satır · {line.quantity} adet</span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onLineQuantity(line.id, -1)}
                                    aria-label={`${productName} ${index + 1}. satırı azalt`}
                                    className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground"
                                >
                                    <Minus className="size-4.5" strokeWidth={2.4} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onLineQuantity(line.id, 1)}
                                    aria-label={`${productName} ${index + 1}. satırı artır`}
                                    className="flex size-12 items-center justify-center rounded-full bg-muted text-foreground"
                                >
                                    <Plus className="size-4.5" strokeWidth={2.4} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    )}
                    {quickNotes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {quickNotes.map(chip => {
                                const on = line.chips.includes(chip);
                                return (
                                    <button
                                        key={chip}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => onToggleChip(line.id, chip)}
                                        className={cn(
                                            'min-h-11 rounded-full border px-3.5 text-sm font-semibold',
                                            on ? 'border-rb-gold bg-rb-gold-bg text-foreground' : 'border-border bg-background text-rb-text-sub',
                                        )}
                                    >
                                        {chip}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <input
                        value={line.text}
                        onChange={e => onLineText(line.id, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        maxLength={200}
                        placeholder="Not yaz (ör. az tuzlu)"
                        aria-label={multiple ? `${productName} ${index + 1}. satır notu` : `${productName} notu`}
                        className="h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
            ))}
            <button
                type="button"
                onClick={onAddSeparate}
                className="min-h-11 self-start rounded-full border border-dashed border-border px-4 text-sm font-semibold text-rb-text-sub"
            >
                + Ayrı notla 1 tane daha
            </button>
        </div>
    );
}
