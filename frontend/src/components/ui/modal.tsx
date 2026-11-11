import type { ReactElement } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

interface ModalProps {
    open?: boolean;
    onClose: () => void;
    /** Arka plana tıklayınca kapansın mı (form kaybı riski olan pencerelerde false). Escape her zaman kapatır. */
    closeOnOverlay?: boolean;
    /** Karartma katmanının rengi, z-index'i ve iç boşluğu. */
    overlayClassName?: string;
    /** Tek bir öğe: pencerenin kutusu. Radix içeriği olur (odak tuzağı, role="dialog", kaydırma kilidi). */
    children: ReactElement;
}

// Tüm elle yazılmış pencerelerin ortak kabuğu. Görünüm çağıranın kutusunda kalır; davranış (Escape,
// odak, ekran okuyucu) buradan gelir. Başlık için <ModalTitle> kullanın.
export function Modal({ open = true, onClose, closeOnOverlay = true, overlayClassName, children }: ModalProps) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={next => { if (!next) onClose(); }}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className={cn('fixed inset-0 z-50 flex items-center justify-center overflow-y-auto', overlayClassName)}
                >
                    <DialogPrimitive.Content
                        asChild
                        aria-describedby={undefined}
                        onInteractOutside={event => { if (!closeOnOverlay) event.preventDefault(); }}
                    >
                        {children}
                    </DialogPrimitive.Content>
                </DialogPrimitive.Overlay>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

export const ModalTitle = DialogPrimitive.Title;
