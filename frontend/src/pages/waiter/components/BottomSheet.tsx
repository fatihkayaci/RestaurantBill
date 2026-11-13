import { useEffect, type ReactNode } from 'react';

interface Props {
    label: string;
    onClose: () => void;
    children: ReactNode;
}

// Alttan açılan sayfa: "…" menüsü ve kasa seçimi. Dışına dokunmak ya da Esc kapatır.
export default function BottomSheet({ label, onClose, children }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
            <button
                type="button"
                aria-label="Kapat"
                onClick={onClose}
                className="absolute inset-0 bg-black/45 animate-in fade-in duration-150"
            />
            <div
                role="dialog"
                aria-label={label}
                className="relative flex max-h-[85%] flex-col gap-1 overflow-y-auto rounded-t-3xl bg-card px-3 pt-2.5 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] animate-in slide-in-from-bottom duration-200"
            >
                <span aria-hidden="true" className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-border" />
                {children}
            </div>
        </div>
    );
}

interface ItemProps {
    icon: ReactNode;
    title: string;
    hint?: string;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}

export function SheetItem({ icon, title, hint, danger, disabled, onClick }: ItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex min-h-14 items-center gap-3.5 rounded-2xl px-3.5 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50 ${danger ? 'text-rb-red' : 'text-foreground'}`}
        >
            <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden="true">{icon}</span>
            <span className="flex min-w-0 flex-col">
                <span className="text-base font-semibold">{title}</span>
                {hint && <span className="text-[13px] text-rb-text-sub">{hint}</span>}
            </span>
        </button>
    );
}
