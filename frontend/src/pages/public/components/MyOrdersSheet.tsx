import { BellRing, X } from 'lucide-react';
import { ORDER_REQUEST_APPROVED, ORDER_REQUEST_REJECTED } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { serif } from '../site/siteParts';
import { closeCircle, eyebrowAccent, pillDark, pillOutline, sheetBackdrop, sheetPanel } from '../table/tableUi';
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
        return { label: 'Mutfakta', className: 'bg-[var(--site-ok-bg)] text-[var(--site-ok)]' };
    if (status === ORDER_REQUEST_REJECTED)
        return { label: 'Onaylanmadı', className: 'bg-[var(--site-error-bg)] text-[var(--site-error)]' };
    return { label: 'Garson onayı bekliyor', className: 'bg-[var(--site-mustard)] text-[var(--site-text)]' };
}

const timeOf = (sentAt: number) => new Date(sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

// Bu masadan gönderilen siparişler ve garsonun kararı. Kalemler müşterinin telefonundan gelir. Reddedilen siparişte
// garsonun yazdığı neden alıntı olarak durur ve bir sonraki adım (menüye dön / garson çağır) gösterilir.
// Görünüm (Renkli): krem pencere, her sipariş kum zeminli yuvarlak kutu; durum hapı (hardal: bekliyor, yeşil: mutfakta).
export default function MyOrdersSheet({ requests, onClose, onBackToMenu, onCallWaiter }: Props) {
    const anyRejected = requests.some(r => r.status === ORDER_REQUEST_REJECTED);
    return (
        <div className={sheetBackdrop} onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Siparişlerim"
                className={sheetPanel}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-6">
                    <div className="min-w-0">
                        <p className={cn(eyebrowAccent, 'm-0')}>Bu masadan</p>
                        <h2 className={cn(serif, 'm-0 mt-1 text-[34px] leading-none')}>Siparişlerim</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Siparişlerimi kapat" className={closeCircle}>
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2.5 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2" aria-live="polite">
                    {requests.map(request => {
                        const badge = statusBadge(request.status);
                        const rejected = request.status === ORDER_REQUEST_REJECTED;
                        return (
                            <li key={request.id} className="rounded-[20px] bg-[var(--site-bg)] p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-bold tabular-nums text-[var(--site-sub)]">{timeOf(request.sentAt)}</span>
                                    <span className={cn('rounded-full px-3 py-1 text-[13px] font-extrabold', badge.className)}>{badge.label}</span>
                                </div>
                                <p className={cn(serif, 'm-0 mt-2 text-[19px] leading-snug', rejected && 'text-[var(--site-sub)]')}>
                                    {request.items.map(item => `${item.quantity}× ${item.name}`).join(' · ')}
                                </p>
                                {rejected && request.rejectReason && (
                                    <blockquote className={cn(serif, 'm-0 mt-2 border-l-[3px] border-[var(--site-error-line)] pl-3 text-[18px] font-semibold italic leading-snug')}>
                                        "{request.rejectReason}"
                                    </blockquote>
                                )}
                                <p className="m-0 mt-2 text-[15px] font-extrabold tabular-nums">{formatPrice(request.total)} ₺</p>
                            </li>
                        );
                    })}
                </ul>

                {anyRejected && (
                    <div className="grid shrink-0 grid-cols-2 gap-2.5 border-t border-[var(--site-border)] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                        <button type="button" onClick={() => { onClose(); onBackToMenu?.(); }}
                            className={cn(pillDark, 'h-12 px-4 text-[15px]', !onCallWaiter && 'col-span-2')}>
                            Menüye dön
                        </button>
                        {onCallWaiter && (
                            <button type="button" onClick={() => { onClose(); onCallWaiter(); }} className={cn(pillOutline, 'px-4')}>
                                <BellRing className="h-4 w-4" aria-hidden="true" />Garson çağır
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
