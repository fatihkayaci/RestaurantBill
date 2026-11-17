import { Check, UserMinus } from 'lucide-react';
import type { CourierCashSummary } from '@/features/courier/types';
import { cn } from '@/lib/utils';
import { courierLoadText } from '../deliveryStatus';

interface Props {
    couriers: CourierCashSummary[];
    /** Siparişin şu anki kuryesi. */
    selectedId?: string | null;
    disabled?: boolean;
    /** null: atama kaldırılır. */
    onPick: (courierUserId: string | null) => void;
}

// Kurye seçici: her kurye bir satır; adı ve şu anki yükü (Boşta / N sipariş bekliyor · M yolda). Boştakiler üstte.
// Kart üzerinde (pano) ve sipariş detayında aynı liste kullanılır.
export default function CourierPicker({ couriers, selectedId, disabled, onPick }: Props) {
    if (couriers.length === 0) {
        return <p className="text-sm text-muted-foreground">Şubede kurye yok. Çalışanlar sayfasından Kurye rolüyle ekleyin.</p>;
    }

    const sorted = [...couriers].sort((a, b) => a.openOrderCount - b.openOrderCount || a.fullName.localeCompare(b.fullName, 'tr'));

    return (
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Kurye seç">
            {sorted.map(c => {
                const selected = c.userId === selectedId;
                const free = c.openOrderCount === 0;
                return (
                    <button
                        key={c.userId}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => { if (!selected) onPick(c.userId); }}
                        className={cn(
                            'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-left transition-colors disabled:opacity-50',
                            selected ? 'border-rb-gold bg-rb-gold/15' : 'border-border bg-card hover:border-rb-gold'
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <span className={cn('h-2 w-2 shrink-0 rounded-full', free ? 'bg-rb-green' : c.onTheWayCount > 0 ? 'bg-rb-accent' : 'bg-rb-amber')} aria-hidden="true" />
                            <span className="truncate text-sm font-semibold text-foreground">{c.fullName}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                            <span className={cn(
                                'rounded px-1.5 py-0.5 text-[11px] font-bold',
                                free ? 'bg-rb-green-bg text-rb-green' : c.onTheWayCount > 0 ? 'bg-rb-accent-bg text-rb-accent' : 'bg-rb-amber-bg text-rb-amber'
                            )}>
                                {courierLoadText(c)}
                            </span>
                            {selected && <Check className="h-4 w-4 text-rb-gold" aria-hidden="true" />}
                        </span>
                    </button>
                );
            })}
            {selectedId && (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(null)}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-rb-red disabled:opacity-50"
                >
                    <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />Atamayı kaldır
                </button>
            )}
        </div>
    );
}
