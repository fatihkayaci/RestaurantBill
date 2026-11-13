import { AlertCircle, Clock, QrCode } from 'lucide-react';
import type { Table } from '@/features/tables/types';
import { formatMinutes, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { STATE_STYLE, minutesSince, tableState } from '../waiterUi';

interface Props {
    table: Table;
    now: number;
    selected: boolean;
    /** Onay bekleyen QR sipariş sayısı. */
    qrCount: number;
    /** Rezerve masada saat ve misafir (biliniyorsa). */
    reservationLabel?: string;
    /** Tablette kart biraz daha büyük. */
    large?: boolean;
    onClick: () => void;
}

export default function WaiterTableCard({ table, now, selected, qrCount, reservationLabel, large, onClick }: Props) {
    const state = tableState(table);
    const style = STATE_STYLE[state];
    const overdue = (table.overdueItemCount ?? 0) > 0;
    const busy = state === 'occ' || state === 'bill';
    const minutes = busy && table.occupiedSince ? minutesSince(table.occupiedSince, now) : null;
    const meta = busy
        ? (minutes !== null ? formatMinutes(minutes) : '')
        : state === 'res' ? (reservationLabel ?? 'Rezervasyon var') : 'Boş';
    const amount = busy ? `₺${formatPrice(table.activeOrderTotal)}` : '';

    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            aria-label={`${table.name}, ${style.label}${amount ? `, ${amount}` : ''}${overdue ? ', gecikme var' : ''}${qrCount ? `, ${qrCount} QR sipariş` : ''}`}
            className={cn(
                'flex flex-col gap-2 rounded-[18px] p-3 pl-3.5 text-left text-foreground transition-transform active:scale-[0.98]',
                large ? 'min-h-37 gap-2.5 px-4 py-3.5' : 'min-h-32',
                style.card,
                selected && 'outline-[3px] outline-offset-2 outline-foreground',
            )}
        >
            <div className="flex w-full items-start justify-between gap-1.5">
                <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium text-rb-text-sub">{table.regionName}</span>
                    <span className={cn('truncate font-serif font-bold leading-none', large ? 'text-[28px]' : 'text-[26px]')}>{table.name}</span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rb-red px-1.5 py-0.5 text-[11px] font-bold text-rb-red-foreground">
                            <AlertCircle className="size-3" strokeWidth={2.6} aria-hidden="true" />Gecikme
                        </span>
                    )}
                    {qrCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-1.5 py-0.5 text-[11px] font-bold text-rb-gold">
                            <QrCode className="size-3" strokeWidth={2.4} aria-hidden="true" />QR {qrCount}
                        </span>
                    )}
                </div>
            </div>
            <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-xs font-bold', style.pill)}>
                <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden="true" />
                {style.label}
            </span>
            <div className="mt-auto flex w-full items-end justify-between gap-2">
                <span className={cn('inline-flex min-w-0 items-center gap-1 text-[13px] font-medium', overdue ? 'text-rb-red' : 'text-rb-text-sub')}>
                    {busy && <Clock className="size-3.5 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{meta}</span>
                </span>
                {amount && <span className="shrink-0 text-[17px] font-bold">{amount}</span>}
            </div>
        </button>
    );
}
