import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { headingFont } from '../site/siteTheme';

interface Props {
    title: string;
    onClose: () => void;
    /** Gönderim sürerken kapatılamaz. */
    locked?: boolean;
    footer?: ReactNode;
    children: ReactNode;
}

// Müşteri sitesinin alttan açılan penceresi. Portal kullanılmaz: sitenin renk değişkenleri (siteRootStyle) sayfanın kök
// kutusunda tanımlı, pencere onun içinde kalmalı. Escape ve arka plana dokunuş kapatır; açıkken sayfa kaymaz.
export default function Sheet({ title, onClose, locked = false, footer, children }: Props) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !locked) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, locked]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const opener = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();
        return () => {
            document.body.style.overflow = previous;
            opener?.focus?.();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center sm:p-4" onClick={() => { if (!locked) onClose(); }}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl border-t border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] outline-none animate-in slide-in-from-bottom duration-200 sm:max-w-lg sm:rounded-3xl sm:border"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--site-border)] px-5 py-4">
                    <h2 id={titleId} className={cn(headingFont, 'min-w-0 truncate text-2xl font-bold')}>{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={locked}
                        aria-label="Kapat"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--site-sub)] hover:bg-[var(--site-raised)] disabled:opacity-40"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="border-t border-[var(--site-border)] p-4">{footer}</div>}
            </div>
        </div>
    );
}
