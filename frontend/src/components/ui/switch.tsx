import { cn } from '@/lib/utils';

interface SwitchTrackProps {
    checked: boolean;
    /** Açıkken iz rengi; varsayılan yeşil (aktif/satışta). */
    onClassName?: string;
    /** Kapalıyken iz rengi. */
    offClassName?: string;
    className?: string;
}

// Anahtarın görsel kısmı. Tıklanan öğe her zaman dışarıdaki <button role="switch" aria-checked> olur;
// iz yalnızca görünümdür, ekran okuyucudan gizlenir.
export function SwitchTrack({ checked, onClassName = 'bg-rb-green', offClassName = 'bg-(--rb-toggle-track-off)', className }: SwitchTrackProps) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
                checked ? onClassName : offClassName,
                className
            )}
        >
            <span className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
                checked ? 'translate-x-4' : 'translate-x-0.5'
            )} />
        </span>
    );
}

interface SwitchProps extends SwitchTrackProps {
    onCheckedChange: (checked: boolean) => void;
    label?: React.ReactNode;
    'aria-label'?: string;
    disabled?: boolean;
    buttonClassName?: string;
}

// Etiketli anahtar: <Switch checked={x} onCheckedChange={setX} label="Satışta" />.
export function Switch({ checked, onCheckedChange, label, disabled, buttonClassName, onClassName, offClassName, className, ...rest }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={rest['aria-label']}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn('flex items-center gap-2 disabled:opacity-50', buttonClassName)}
        >
            <SwitchTrack checked={checked} onClassName={onClassName} offClassName={offClassName} className={className} />
            {label}
        </button>
    );
}
