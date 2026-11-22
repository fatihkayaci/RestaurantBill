import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ORDER_REQUEST_APPROVED, ORDER_REQUEST_REJECTED, type PublicTableBillLine } from '@/features/customerSite/types';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SentOrderRequest } from '../useTableOrderRequests';
import { timeOf } from './qrModel';
import { focusRing } from './qrUi';

// Sepet ve Hesabım'ın ortak parçaları: "Paket" etiketi, durum çipi, gönderilen siparişlerin kartları ve masanın
// hesap satırları. Hepsi aynı görsel dil: kalın ad, gri ayrıntı, sağda fiyat; tek renkli durum noktası.

/** "Paket olsun" denen kalemin küçük etiketi. */
export function PaketTag({ className }: { className?: string }) {
    return (
        <span className={cn('ml-1.5 inline-block rounded-md border border-[var(--site-border-mid)] px-1.5 align-[1px] text-[11px] font-bold leading-[18px] text-[var(--site-sub)]', className)}>
            Paket
        </span>
    );
}

/** Durum tonu: bekliyor amber, mutfakta vurgu, ödendi yeşil, onaylanmadı kırmızı. Renk yalnız noktada; yazı okunur kalır. */
export type StatusTone = 'waiting' | 'kitchen' | 'paid' | 'rejected' | 'open';

const DOT: Record<StatusTone, string> = {
    waiting: 'bg-[#D97706]',
    kitchen: 'bg-[var(--site-accent)]',
    paid: 'bg-[var(--site-ok)]',
    rejected: 'bg-[var(--site-error)]',
    open: 'bg-[var(--site-accent)]',
};

export function StatusChip({ tone, children }: { tone: StatusTone; children: string }) {
    return (
        <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-bold leading-none',
            tone === 'rejected' ? 'bg-[var(--site-error-bg)] text-[var(--site-error)]'
                : tone === 'paid' ? 'bg-[var(--site-ok-bg)] text-[var(--site-ok)]'
                    : 'bg-[var(--site-alt)] text-[var(--site-text)]')}>
            <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', DOT[tone])} />
            {children}
        </span>
    );
}

// paidAtMs: bu telefonun son ödenen hesabının kapanışı. Ondan önce onaylanan talep o hesapla ödenmiştir.
function requestStatus(request: SentOrderRequest, paidAtMs: number | null): { tone: StatusTone; label: string } {
    if (request.status === ORDER_REQUEST_APPROVED) {
        if (paidAtMs != null && request.sentAt <= paidAtMs) return { tone: 'paid', label: 'Ödendi' };
        return { tone: 'kitchen', label: 'Mutfakta' };
    }
    if (request.status === ORDER_REQUEST_REJECTED) return { tone: 'rejected', label: 'Onaylanmadı' };
    return { tone: 'waiting', label: 'Onay bekliyor' };
}

/** Bu telefondan gönderilen siparişlerin satırları (çağıran sıralar): saat, durum, tek satır özet, tutar; reddedilende neden. */
export function RequestList({ requests, paidAtMs }: { requests: SentOrderRequest[]; paidAtMs: number | null }) {
    return (
        <ul className="m-0 list-none divide-y divide-[var(--site-border)] p-0">
            {requests.map(request => {
                const status = requestStatus(request, paidAtMs);
                const rejected = status.tone === 'rejected';
                const summary = request.items.map(item => `${item.quantity}× ${item.name}`).join(', ');
                const anyTakeaway = request.items.some(item => item.takeaway);
                return (
                    <li key={request.id} className="py-3">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] font-semibold tabular-nums text-[var(--site-sub)]">{timeOf(request.sentAt)}</span>
                            <StatusChip tone={status.tone}>{status.label}</StatusChip>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between gap-3">
                            <p className={cn('m-0 min-w-0 flex-1 truncate text-[15px] font-semibold', rejected && 'text-[var(--site-sub)]')}>
                                {summary}
                            </p>
                            <span className={cn('shrink-0 text-[15px] font-extrabold tabular-nums', rejected && 'text-[var(--site-sub)]')}>{formatPrice(request.total)} ₺</span>
                        </div>
                        {anyTakeaway && <p className="m-0 mt-1"><PaketTag className="ml-0" /></p>}
                        {rejected && request.rejectReason && (
                            <p className="m-0 mt-2 text-sm leading-snug text-[var(--site-error)]">Garsonun notu: {request.rejectReason}</p>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

const COLLAPSED_LINES = 6;

/**
 * Masanın hesap satırları (adisyon): "adet × ad … tutar", altında gri ayrıntı (menünün içi, not). collapsible: uzun
 * listede ilk altısı ve "Tümünü göster".
 */
export function BillLines({ items, collapsible = false }: { items: PublicTableBillLine[]; collapsible?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const hidden = collapsible && !expanded ? Math.max(0, items.length - COLLAPSED_LINES) : 0;
    const shown = hidden > 0 ? items.slice(0, COLLAPSED_LINES) : items;

    if (items.length === 0) return <p className="m-0 py-3 text-[15px] text-[var(--site-sub)]">Hesapta henüz ürün yok.</p>;

    return (
        <>
            <ul className="m-0 list-none p-0">
                {shown.map((item, i) => {
                    const sub = [...item.details, item.note ? `Not: ${item.note}` : ''].filter(Boolean).join(' · ');
                    return (
                        <li key={`${item.name}-${i}`} className="flex items-start justify-between gap-3 py-2">
                            <span className="min-w-0 flex-1">
                                <span className="block break-words text-[15px] font-semibold leading-snug">
                                    <span className="tabular-nums text-[var(--site-sub)]">{item.quantity} ×</span> {item.name}
                                    {item.isTakeaway && <PaketTag />}
                                </span>
                                {sub && <span className="mt-0.5 block break-words text-[13px] leading-snug text-[var(--site-sub)]">{sub}</span>}
                            </span>
                            <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatPrice(item.lineTotal)} ₺</span>
                        </li>
                    );
                })}
            </ul>
            {(hidden > 0 || (collapsible && expanded && items.length > COLLAPSED_LINES)) && (
                <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
                    className={cn('mt-1 inline-flex min-h-11 items-center gap-1 rounded-xl text-sm font-bold text-[var(--site-accent-text)]', focusRing)}>
                    {expanded ? 'Daha az göster' : `Tümünü göster (${items.length})`}
                    <ChevronDown className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} aria-hidden="true" />
                </button>
            )}
        </>
    );
}
