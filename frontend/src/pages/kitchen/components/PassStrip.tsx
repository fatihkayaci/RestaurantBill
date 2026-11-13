import { useState } from 'react';
import { ChevronDown, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock, itemCountText, type Ticket } from '../kitchenTickets';

interface PassStripProps {
    tickets: Ticket[];
    now: number;
    busyKeys: ReadonlySet<string>;
    onTaken: (ticket: Ticket) => void;
    onUndo: (ticket: Ticket) => void;
}

// Alttaki pasa şeridi: hazırlanmış, garsonun almasını bekleyen biletler. "Alındı" ürünleri servis edildi yapar,
// "Geri al" bileti bekleyen haline döndürüp raya geri koyar. Telefonda katlanır (varsayılan kapalı).
export default function PassStrip({ tickets, now, busyKeys, onTaken, onUndo }: PassStripProps) {
    const [open, setOpen] = useState(false);

    return (
        <section
            aria-label="Pasa, garson bekliyor"
            className="shrink-0 border-t-4 border-(--kitchen-ok) bg-[color-mix(in_oklab,var(--kitchen-ok)_12%,transparent)] sm:flex sm:min-h-40 sm:items-center sm:gap-5 sm:px-6"
        >
            {/* Telefon: katlanır başlık */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex min-h-14 w-full items-center gap-3 px-4 text-left sm:hidden"
            >
                <span className="text-2xl font-bold tracking-[0.12em] text-(--kitchen-ok)">PASA</span>
                <span className="rounded-full bg-(--kitchen-ok) px-2.5 py-0.5 text-sm font-bold text-card">{tickets.length}</span>
                <span className="text-sm font-semibold text-rb-text-sub">Garson alınca dokun</span>
                <ChevronDown className={cn('ml-auto h-5 w-5 text-rb-text-sub transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>

            {/* Tablet: sabit etiket */}
            <div className="hidden w-36 shrink-0 sm:block">
                <p className="text-4xl font-bold leading-none tracking-[0.1em] text-(--kitchen-ok)">PASA</p>
                <p className="mt-1.5 text-sm font-semibold text-rb-text-sub">Garson alınca dokun</p>
            </div>

            <div className={cn(
                'kitchen-rail-scroll min-w-0 flex-1 gap-3 overflow-x-auto px-4 pb-4 sm:flex sm:px-0 sm:py-3',
                open ? 'flex' : 'hidden'
            )}>
                {tickets.length === 0 ? (
                    <p className="self-center py-2 text-base font-semibold text-rb-text-sub">Pasada bekleyen tabak yok.</p>
                ) : tickets.map(ticket => {
                    const busy = busyKeys.has(ticket.key);
                    const summary = ticket.items.map(i => `${i.quantity}× ${i.productName}`).join(', ');
                    return (
                        <div key={ticket.key} className="kitchen-paper flex w-60 shrink-0 flex-col gap-2 rounded-xl p-3 shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="min-w-0 truncate text-2xl font-bold leading-none">{ticket.order.tableName}</span>
                                <span className="shrink-0 text-sm font-bold tabular-nums text-muted-foreground">{formatClock(now - ticket.startedAt)}</span>
                            </div>
                            <p className="line-clamp-2 min-h-10 text-sm font-semibold text-muted-foreground" title={summary}>
                                <span className="text-foreground">{itemCountText(ticket.items)}</span> · {summary}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onUndo(ticket)}
                                    aria-label={`${ticket.order.tableName}: raya geri al`}
                                    title="Raya geri al"
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                                >
                                    <Undo2 className="h-5 w-5" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onTaken(ticket)}
                                    aria-label={`${ticket.order.tableName}: garson aldı`}
                                    className="h-12 flex-1 rounded-lg bg-(--kitchen-ok) text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                                >
                                    Alındı
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
