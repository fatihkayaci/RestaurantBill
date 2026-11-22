import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal, ModalTitle } from '@/components/ui/modal';

export interface PaymentShellProps {
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
    /** Pencerenin altında sabit kalan düğmeler (Vazgeç / Uygula). */
    footer?: ReactNode;
}

/**
 * Ödeme ekranının ara pencereleri (İndirim / İkram Ekle, Hesabı Böl). Ödeme paneli z-80 katmanda açıldığı için
 * pencere onun üstünde (z-90) durur. Odak tuzağı, Escape ve ekran okuyucu davranışı ortak Modal'dan gelir.
 * Telefonda tam ekran, geniş ekranda ortada kart.
 */
export default function PaymentDialog({ title, description, onClose, children, footer }: PaymentShellProps) {
    return (
        <Modal onClose={onClose} closeOnOverlay={false} overlayClassName="z-90 bg-black/50 backdrop-blur-[2px] sm:p-4">
            <div className="flex h-dvh w-full max-w-lg flex-col bg-card text-foreground shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl sm:border sm:border-border">
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
                    <div className="min-w-0">
                        <ModalTitle className="font-serif text-2xl font-bold leading-tight text-foreground">{title}</ModalTitle>
                        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Kapat"
                        className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="shrink-0 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
            </div>
        </Modal>
    );
}
