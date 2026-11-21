import { Copy } from 'lucide-react';
import { inputClass } from '@/lib/formStyles';
import { cn } from '@/lib/utils';

// Haftalık saat formlarının (rezervasyon, online sipariş) ortak parçaları: 24 saat düğmesi, saat seçici, kopyala bağlantısı.

/** Günün "24 saat" düğmesi; açıkken altın renkli. */
export function AllDayPill({ on, onToggle, ariaLabel }: { on: boolean; onToggle: (on: boolean) => void; ariaLabel: string }) {
    return (
        <button
            type="button"
            aria-pressed={on}
            aria-label={ariaLabel}
            onClick={() => onToggle(!on)}
            className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                on ? 'border-rb-gold bg-rb-gold text-rb-gold-foreground' : 'border-border text-foreground hover:bg-muted'
            )}
        >
            24 saat
        </button>
    );
}

interface TimeSelectProps {
    label: string;
    ariaLabel: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    /** Seçilemeyen saatler (ör. ilk saatten önceki son saatler). */
    isDisabled?: (time: string) => boolean;
    error?: boolean;
    errorId?: string;
}

/** Etiketli 24 saatlik saat listesi (tarayıcının ÖÖ/ÖS saat kutusu yerine). */
export function TimeSelect({ label, ariaLabel, value, options, onChange, isDisabled, error, errorId }: TimeSelectProps) {
    return (
        <label className="flex flex-col gap-1 sm:w-40">
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            <select
                aria-label={ariaLabel}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                value={value}
                onChange={e => onChange(e.target.value)}
                className={cn(inputClass, 'py-1.5 tabular-nums', error && 'border-destructive')}
            >
                {options.map(t => <option key={t} value={t} disabled={isDisabled?.(t)}>{t}</option>)}
            </select>
        </label>
    );
}

/** Satırın sağındaki "Tüm günlere kopyala" bağlantısı. */
export function CopyToAllButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-rb-accent transition-opacity hover:opacity-80"
        >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Tüm günlere kopyala
        </button>
    );
}
