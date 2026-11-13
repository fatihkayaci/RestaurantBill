import { AlarmClock, Check } from 'lucide-react';
import type { OrderItem } from '@/features/orders/types';
import { cn } from '@/lib/utils';
import { formatClock, isWaiting, itemCountText, NEW_BAND_MS, ticketTimer, type Ticket } from '../kitchenTickets';

interface TicketCardProps {
    ticket: Ticket;
    now: number;
    busy: boolean;
    onToggleItem: (ticket: Ticket, item: OrderItem) => void;
    onPass: (ticket: Ticket) => void;
}

// Raydaki tek bilet: açık "kâğıt" kart (koyu temada da). Üstte masa + geçen süre, hedef süre çubuğu,
// ürünler (dokunarak tek tek hazır), altta büyük PASAYA.
export default function TicketCard({ ticket, now, busy, onToggleItem, onPass }: TicketCardProps) {
    const { order, items } = ticket;
    const timer = ticketTimer(ticket, now);
    const late = timer?.state === 'late';
    const soon = timer?.state === 'soon';
    const isNew = ticket.seenAt > 0 && now - ticket.seenAt < NEW_BAND_MS;
    const waitingCount = items.filter(isWaiting).length;

    // Durum renkleri index.css'teki soluk mutfak tonları (--kitchen-*); gecikme ayrıca bant + ikon + etiketle ayrışır.
    const barColor = late ? 'bg-(--kitchen-late)' : soon ? 'bg-(--kitchen-warn)' : 'bg-rb-gold';
    const barText = late ? 'text-(--kitchen-late)' : soon ? 'text-(--kitchen-warn)' : 'text-muted-foreground';

    return (
        <article
            aria-label={`${order.tableName}${late ? ', gecikti' : ''}${isNew ? ', yeni geldi' : ''}`}
            data-ticket-key={ticket.key}
            className={cn('flex h-full w-[min(82vw,300px)] shrink-0 flex-col items-center sm:w-[272px]', isNew && 'kitchen-ticket-in')}
        >
            {/* Raya asılı mandal */}
            <div aria-hidden="true" className="h-5 w-14 shrink-0 rounded-b-md bg-[#7A6E60] dark:bg-[#5A4E3C]" />

            <div
                className={cn(
                    'kitchen-paper flex min-h-[320px] w-full flex-1 flex-col overflow-hidden rounded-b-xl rounded-t-sm shadow-[0_6px_18px_rgba(0,0,0,0.28)]',
                    late ? 'ring-[3px] ring-(--kitchen-late-line)' : isNew ? 'ring-4 ring-rb-gold' : 'ring-1 ring-black/5'
                )}
            >
                {isNew && (
                    <div className="shrink-0 bg-rb-gold py-1 text-center text-lg font-bold tracking-[0.18em] text-rb-gold-foreground">
                        YENİ GELDİ
                    </div>
                )}

                <header className={cn('shrink-0 px-4 pb-2 pt-3', late && 'border-t-[6px] border-(--kitchen-late) bg-(--kitchen-late-soft) pt-2')}>
                    <div className="flex items-baseline justify-between gap-2">
                        <h2 className="min-w-0 truncate text-3xl font-bold leading-none sm:text-4xl">{order.tableName}</h2>
                        <span className="shrink-0 text-2xl font-bold tabular-nums sm:text-3xl" aria-label="Geçen süre">
                            {formatClock(now - ticket.startedAt)}
                        </span>
                    </div>
                    <p className={cn('mt-1 truncate text-sm font-semibold', 'text-muted-foreground')}>
                        {[order.createdByUserName, itemCountText(items)].filter(Boolean).join(' · ')}
                    </p>
                </header>

                {timer && ticket.prepMinutes != null && (
                    <div className="shrink-0 px-4 pb-1 pt-2">
                        <div className={cn('flex justify-between text-xs font-bold tracking-wide', barText)}>
                            <span className="flex items-center gap-1">
                                {late && <AlarmClock className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />}
                                {late ? `GECİKTİ +${timer.minutes} DK` : soon ? 'AZ KALDI' : 'SÜRE'}
                            </span>
                            <span>{late ? `hedef ${ticket.prepMinutes} dk` : `${timer.minutes} dk kaldı`}</span>
                        </div>
                        <div
                            role="img"
                            aria-label={`Hazırlık süresi ${ticket.prepMinutes} dakika, geçen ${Math.floor(timer.elapsedMs / 60_000)} dakika`}
                            className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-muted"
                        >
                            <div className={cn('h-full rounded-full transition-[width] duration-1000', barColor)} style={{ width: `${Math.min(100, Math.max(4, timer.ratio * 100))}%` }} />
                        </div>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-1">
                    {order.note && (
                        <p className="mt-2 rounded-lg border border-(--kitchen-warn)/35 bg-(--kitchen-warn-soft) px-2.5 py-1.5 text-sm font-semibold">
                            <span className="font-bold">Masa notu: </span>{order.note}
                        </p>
                    )}
                    <ul>
                        {items.map(item => {
                            const ready = !isWaiting(item);
                            return (
                                <li key={item.id} className="flex items-start gap-3 border-b-2 border-dashed border-border py-2.5 last:border-b-0">
                                    <div className="min-w-0 flex-1">
                                        <p className={cn(
                                            'text-2xl font-bold leading-tight',
                                            ready && 'text-muted-foreground line-through decoration-2'
                                        )}>
                                            <span className="tabular-nums">{item.quantity}×</span> {item.productName}
                                        </p>
                                        {item.note && (
                                            <span className="mt-1.5 inline-block rounded-md bg-foreground px-2 py-0.5 text-base font-bold text-rb-gold">
                                                {item.note}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => onToggleItem(ticket, item)}
                                        aria-pressed={ready}
                                        aria-label={ready ? `${item.productName}: hazır işaretini geri al` : `${item.productName} hazır`}
                                        title={ready ? 'Geri al' : 'Bu ürün hazır'}
                                        className={cn(
                                            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50',
                                            ready
                                                ? 'border-(--kitchen-ok) bg-(--kitchen-ok) text-white'
                                                : 'border-(--kitchen-ok)/50 text-(--kitchen-ok) hover:bg-(--kitchen-ok-soft)'
                                        )}
                                    >
                                        <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="shrink-0 px-3 pb-3 pt-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onPass(ticket)}
                        className="flex h-16 w-full items-center justify-center gap-2.5 rounded-xl bg-foreground text-2xl font-bold tracking-[0.12em] text-card transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                        <Check className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
                        PASAYA
                        {waitingCount < items.length && (
                            <span className="text-sm font-semibold tracking-normal opacity-70">({waitingCount} kaldı)</span>
                        )}
                    </button>
                </div>
            </div>
        </article>
    );
}
