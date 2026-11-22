import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';

interface Props {
    label: string;
    onClose: () => void;
    children: ReactNode;
    /** Kaydırılan içeriğin altında hep görünür kalan alan (ör. onay düğmesi). */
    footer?: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Alttan açılan sayfa: "…" menüsü, menü seçimi, ödeme ekranının Hesabı böl / İndirim sayfaları. Dışına dokunmak ya
// da Esc kapatır. Açılınca odak sayfaya girer (içerideki autoFocus korunur), Tab sayfanın içinde döner, kapanınca
// odak açan düğmeye geri döner.
export default function BottomSheet({ label, onClose, children, footer }: Props) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const dialog = dialogRef.current;
        if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (opener?.isConnected) opener.focus();
        };
    }, []);

    const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Tab' || !dialogRef.current) return;
        const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null);
        if (items.length === 0) { e.preventDefault(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
            <button
                type="button"
                aria-label="Kapat"
                tabIndex={-1}
                onClick={onClose}
                className="absolute inset-0 bg-black/45 animate-in fade-in duration-150"
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                onKeyDown={trapTab}
                className="relative flex max-h-[85%] flex-col overflow-hidden rounded-t-3xl bg-card pt-2.5 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] outline-none animate-in slide-in-from-bottom duration-200"
            >
                <span aria-hidden="true" className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-border" />
                <div className={`flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 ${footer ? 'pb-2' : 'pb-[max(16px,env(safe-area-inset-bottom))]'}`}>
                    {children}
                </div>
                {footer && (
                    <div className="shrink-0 border-t border-border bg-card px-3 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
                        {footer}
                    </div>
                )}
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
