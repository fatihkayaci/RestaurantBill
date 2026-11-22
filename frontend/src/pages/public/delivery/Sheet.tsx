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
    /**
     * Her genişlikte alttan açılır (masa QR menüsünün telefon sütunu: 520 px, ortada). Verilmezse geniş ekranda ortada pencere.
     */
    bottom?: boolean;
}

// Müşteri sitesinin alttan açılan penceresi. Portal kullanılmaz: sitenin renk değişkenleri (siteRootStyle) sayfanın kök
// kutusunda tanımlı, pencere onun içinde kalmalı. Escape, kapat düğmesi ve arka plana dokunuş kapatır; odak içeride döner;
// açıkken sayfa kaymaz; alt kenar telefonun güvenli alanını bırakır.
export default function Sheet({ title, onClose, locked = false, footer, children, bottom = false }: Props) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !locked) onClose();
            // Odak pencerenin içinde döner (Tab / Shift+Tab).
            if (e.key !== 'Tab' || !panelRef.current) return;
            const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
            if (focusable.length === 0) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (e.shiftKey && (active === first || active === panelRef.current)) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) { e.preventDefault(); first.focus(); }
        };
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
        <div className={cn('fixed inset-0 z-40 flex flex-col justify-end bg-black/60', bottom ? 'items-center' : 'sm:items-center sm:justify-center sm:p-4')} onClick={() => { if (!locked) onClose(); }}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn('flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] outline-none animate-in slide-in-from-bottom duration-200 motion-reduce:animate-none',
                    bottom ? 'max-w-[520px]' : 'sm:max-w-lg sm:rounded-3xl sm:border')}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--site-border)] px-5 py-4">
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
                <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4', !footer && 'pb-[max(1rem,env(safe-area-inset-bottom))]')}>{children}</div>

                {footer && <div className="shrink-0 border-t border-[var(--site-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
            </div>
        </div>
    );
}
