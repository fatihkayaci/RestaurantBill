import type { ReactNode } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Sayfa başlığındaki "Sırala" / "Bitti" anahtarı: sıralama modu açıkken sürükleme sırayı değiştirir. */
export function SortModeButton({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                active
                    ? 'bg-rb-accent text-rb-accent-foreground hover:opacity-90'
                    : 'border border-border bg-card text-foreground hover:bg-muted',
            )}
        >
            {active ? <Check className="size-4" aria-hidden="true" /> : <ArrowUpDown className="size-4" aria-hidden="true" />}
            {active ? 'Bitti' : 'Sırala'}
        </button>
    );
}

/** Sıralama modunun açık olduğunu belli eden şerit. */
export function SortModeBanner({ children }: { children: ReactNode }) {
    return (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-rb-accent/40 bg-rb-accent-bg px-4 py-3 text-sm text-foreground">
            <ArrowUpDown className="mt-0.5 size-4 shrink-0 text-rb-accent" aria-hidden="true" />
            <div className="space-y-0.5">
                <p className="font-semibold">Sıralama modu</p>
                <p className="text-muted-foreground">{children}</p>
            </div>
        </div>
    );
}
