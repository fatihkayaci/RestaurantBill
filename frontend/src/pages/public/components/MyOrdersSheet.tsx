import { BellRing, X } from 'lucide-react';
import { ORDER_REQUEST_APPROVED, ORDER_REQUEST_REJECTED } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { serif } from '../site/siteParts';
import type { SentOrderRequest } from '../useTableOrderRequests';

interface Props {
    requests: SentOrderRequest[];
    onClose: () => void;
    /** Menüdeyken "Menüye dön" yalnız pencereyi kapatır; karşılamadayken menüyü açar. */
    onBackToMenu?: () => void;
    /** Reddedilen siparişte "Garson çağır" (admin kapattıysa yok). */
    onCallWaiter?: () => void;
}

function statusBadge(status: number) {
    if (status === ORDER_REQUEST_APPROVED)
        return { label: 'Mutfakta', className: 'border-[var(--site-ok-line)] bg-[var(--site-ok-bg)] text-[var(--site-ok)]' };
    if (status === ORDER_REQUEST_REJECTED)
        return { label: 'Onaylanmadı', className: 'border-[var(--site-error-line)] bg-[var(--site-error-bg)] text-[var(--site-error)]' };
    return { label: 'Garson onayı bekliyor', className: 'border-[var(--site-border-strong)] bg-[var(--site-raised)] text-[var(--site-text)]' };
}

const timeOf = (sentAt: number) => new Date(sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

// Bu masadan gönderilen siparişler ve garsonun kararı. Kalemler müşterinin telefonundan gelir. Reddedilen siparişte
// garsonun yazdığı neden alıntı olarak durur ve bir sonraki adım (menüye dön / garson çağır) gösterilir.
export default function MyOrdersSheet({ requests, onClose, onBackToMenu, onCallWaiter }: Props) {
    const anyRejected = requests.some(r => r.status === ORDER_REQUEST_REJECTED);
    return (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/60" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Siparişlerim"
                className="mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border-t border-[var(--site-border)] bg-[var(--site-card)] animate-in slide-in-from-bottom duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--site-border)] px-5 py-4">
                    <h2 className={cn(serif, 'm-0 text-[30px] leading-none')}>Siparişlerim</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Siparişlerimi kapat"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--site-sub)] hover:bg-[var(--site-raised)]"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <ul className="min-h-0 flex-1 divide-y divide-[var(--site-border)] overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]" aria-live="polite">
                    {requests.map(request => {
                        const badge = statusBadge(request.status);
                        const rejected = request.status === ORDER_REQUEST_REJECTED;
                        return (
                            <li key={request.id} className="py-4">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm tabular-nums text-[var(--site-sub)]">{timeOf(request.sentAt)}</span>
                                    <span className={cn('rounded-full border px-3 py-1 text-[13px] font-semibold', badge.className)}>{badge.label}</span>
                                </div>
                                <p className={cn('m-0 mt-2 text-[15px] leading-snug', rejected && 'text-[var(--site-sub)]')}>
                                    {request.items.map(item => `${item.quantity}× ${item.name}`).join(' · ')}
                                </p>
                                {rejected && request.rejectReason && (
                                    <blockquote className={cn(serif, 'm-0 mt-2 border-l-2 border-[var(--site-error-line)] pl-3 text-[19px] italic leading-snug')}>
                                        "{request.rejectReason}"
                                    </blockquote>
                                )}
                                <p className="m-0 mt-2 text-sm font-semibold tabular-nums">{formatPrice(request.total)} ₺</p>
                            </li>
                        );
                    })}
                </ul>

                {anyRejected && (
                    <div className="grid grid-cols-2 gap-2.5 border-t border-[var(--site-border)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                        <button type="button" onClick={() => { onClose(); onBackToMenu?.(); }}
                            className={cn('flex h-12 items-center justify-center rounded-full bg-[var(--site-paper)] text-[15px] font-semibold text-[var(--site-on-paper)]', !onCallWaiter && 'col-span-2')}>
                            Menüye dön
                        </button>
                        {onCallWaiter && (
                            <button type="button" onClick={() => { onClose(); onCallWaiter(); }}
                                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--site-border-strong)] text-[15px] font-semibold">
                                <BellRing className="h-4 w-4" aria-hidden="true" />Garson çağır
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
