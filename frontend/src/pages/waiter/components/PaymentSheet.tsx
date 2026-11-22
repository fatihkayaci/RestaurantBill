import { X } from 'lucide-react';
import type { PaymentShellProps } from '@/pages/cashier/components/PaymentDialog';
import BottomSheet from './BottomSheet';

/**
 * Garson ödeme ekranının alttan açılan sayfası. Kasiyer ekranındaki ödeme penceresiyle (PaymentDialog) aynı
 * arayüzü taşır; Hesabı böl ve İndirim / İkram içerikleri ikisinde de aynı bileşendir.
 */
export default function PaymentSheet({ title, description, onClose, children, footer }: PaymentShellProps) {
    return (
        <BottomSheet label={title} onClose={onClose} footer={footer}>
            <div className="flex items-start justify-between gap-3 px-1 pb-2">
                <div className="min-w-0">
                    <h2 className="font-serif text-[24px] font-bold leading-tight text-foreground">{title}</h2>
                    {description && <p className="mt-0.5 text-[13px] text-rb-text-sub">{description}</p>}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Kapat"
                    className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-rb-text-sub hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            </div>
            <div className="px-1 pb-2">{children}</div>
        </BottomSheet>
    );
}
