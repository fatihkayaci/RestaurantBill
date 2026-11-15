import { X } from 'lucide-react';
import { ORDER_REQUEST_APPROVED, ORDER_REQUEST_REJECTED } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { headingFont } from '../site/siteTheme';
import type { SentOrderRequest } from '../useTableOrderRequests';

interface Props {
    requests: SentOrderRequest[];
    onClose: () => void;
}

function statusBadge(status: number) {
    if (status === ORDER_REQUEST_APPROVED)
        return { label: 'Mutfağa iletildi', className: 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] text-[var(--site-ok)]' };
    if (status === ORDER_REQUEST_REJECTED)
        return { label: 'Onaylanmadı', className: 'border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' };
    return { label: 'Garson onayı bekliyor', className: 'border-[var(--site-border-strong)] bg-[var(--site-raised)] text-[var(--site-text)]' };
}

const timeOf = (sentAt: number) => new Date(sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

// Bu masadan gönderilen siparişler ve garsonun kararı. Kalemler müşterinin telefonundan gelir.
export default function MyOrdersSheet({ requests, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/60" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Siparişlerim"
                className="flex max-h-[90vh] flex-col rounded-t-3xl border-t border-[var(--site-border)] bg-[var(--site-card)] animate-in slide-in-from-bottom duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[var(--site-border)] px-5 py-4">
                    <h2 className={cn(headingFont, 'text-2xl font-bold')}>Siparişlerim</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Siparişlerimi kapat"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-sub)] hover:bg-[var(--site-raised)]"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <ul className="flex-1 divide-y divide-[var(--site-border)] overflow-y-auto px-5 pb-6" aria-live="polite">
                    {requests.map(request => {
                        const badge = statusBadge(request.status);
                        return (
                            <li key={request.id} className="py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-[var(--site-sub)]">{timeOf(request.sentAt)}</span>
                                    <span className={cn('rounded-full border px-3 py-1 text-[13px] font-semibold', badge.className)}>{badge.label}</span>
                                </div>
                                <ul className="mt-2 space-y-1">
                                    {request.items.map((item, i) => (
                                        <li key={i} className="text-[15px]">
                                            <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.name}
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-2 text-sm tabular-nums text-[var(--site-sub)]">{formatPrice(request.total)} ₺</p>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}
