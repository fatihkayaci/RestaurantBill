import type { ReactNode } from 'react';
import { Check, Move, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    editing: boolean;
    onEditingChange: (editing: boolean) => void;
    onReset: () => void;
    disabled?: boolean;
    resetting?: boolean;
    /** Düzenleme açıkken "Varsayılana dön"ün önüne eklenen düğmeler. */
    extra?: ReactNode;
    size?: 'sm' | 'md';
}

// Panel başlığındaki düzen düğmeleri: "Düzenle" kartları sürüklenebilir yapar; açıkken sıfırlama ve "Bitti" görünür.
export default function DashboardEditBar({ editing, onEditingChange, onReset, disabled, resetting, extra, size = 'md' }: Props) {
    const button = cn(
        'inline-flex items-center gap-2 rounded-[10px] border border-border bg-card font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50',
        size === 'md' ? 'h-11 px-4 text-sm' : 'h-9 px-3 text-sm',
    );

    if (!editing) {
        return (
            <button type="button" onClick={() => onEditingChange(true)} disabled={disabled} className={button}>
                <Move className="h-4 w-4" aria-hidden="true" />
                Düzenle
            </button>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span role="status" className="text-xs text-rb-text-sub">Kartları sürükleyerek sıralayın · dokunmatikte basılı tutun</span>
            {extra}
            <button type="button" onClick={onReset} disabled={resetting} className={button}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {resetting ? 'Sıfırlanıyor…' : 'Varsayılana dön'}
            </button>
            <button
                type="button"
                onClick={() => onEditingChange(false)}
                className={cn(button, 'border-transparent bg-rb-gold text-rb-gold-foreground hover:bg-rb-gold hover:opacity-90')}
            >
                <Check className="h-4 w-4" aria-hidden="true" />
                Bitti
            </button>
        </div>
    );
}
