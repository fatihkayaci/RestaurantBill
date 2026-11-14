import { Ban, CalendarClock, Circle, Users } from 'lucide-react';
import { formatCurrency, formatElapsed } from '@/lib/format';
import type { LiveTable, TableKind } from './liveTables';

// Masa kartlarının bileşen olmayan yardımcıları.

export const tableHref = (id: string) => `/admin/tables?table=${id}`;

export const KIND_META: Record<TableKind, { label: string; icon: typeof Circle }> = {
    empty: { label: 'Boş', icon: Circle },
    busy: { label: 'Dolu', icon: Users },
    reserved: { label: 'Rezerve', icon: CalendarClock },
    off: { label: 'Hizmet dışı', icon: Ban },
};

/** Kartın çerçeve/zemin rengi. Renk tek işaret değildir: her kartta durum metni ve simgesi de var. */
export function tableTone(t: LiveTable): string {
    if (t.overdue.length > 0) return 'border-rb-red/60 bg-rb-red-bg';
    if (t.kind === 'busy') return t.longOpen ? 'border-rb-orange/50 bg-rb-amber-bg' : 'border-rb-amber/45 bg-rb-amber-bg';
    if (t.kind === 'reserved') return 'border-rb-accent/45 bg-rb-accent-bg';
    if (t.kind === 'off') return 'border-dashed border-border bg-transparent';
    return 'border-border bg-background';
}

/** Dolu masada "1 sa 5 dk · ₺840", rezervede saat ve isim, boşta sıradaki rezervasyon. */
export function tableLine(t: LiveTable, now: number): string {
    if (t.kind === 'busy') {
        const open = t.occupiedSince ? formatElapsed(t.occupiedSince, now) : 'Açık';
        return `${open} · ${formatCurrency(t.total)}`;
    }
    if (t.kind === 'reserved') return t.nextReservationTime ? `${t.nextReservationTime} ${t.nextReservationGuest ?? ''}`.trim() : 'Rezerve';
    if (t.kind === 'off') return 'Hizmet dışı';
    return t.nextReservationTime ? `${t.nextReservationTime} rezervasyon` : 'Müsait';
}

