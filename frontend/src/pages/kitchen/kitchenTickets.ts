import type { Order, OrderItem } from '@/features/orders/types';

// Ürün durumları (sunucudaki OrderItemStatus).
export const ItemStatus = {
    Pending: 1,
    Preparing: 2,
    Ready: 3,
    Served: 4,
} as const;

// Eski akıştan kalan "Hazırlanıyor" ürünler de rayda bekleyen sayılır; ekranda ayrı bir "Başla" adımı yok.
export const isWaiting = (item: OrderItem) => item.status === ItemStatus.Pending || item.status === ItemStatus.Preparing;
const isOnKitchenScreen = (item: OrderItem) => isWaiting(item) || item.status === ItemStatus.Ready;

// Aynı siparişe sonradan eklenen ürünler (2. tur) ayrı bilet olarak gelir; bu süre içinde eklenenler aynı bilettir.
const ROUND_GAP_MS = 2 * 60_000;
// "YENİ GELDİ" bandı ekranda bu kadar kalır.
export const NEW_BAND_MS = 90_000;

export interface Ticket {
    key: string;
    order: Order;
    /** Biletteki bu istasyonun ürünleri (bekleyen + hazırlanmış). */
    items: OrderItem[];
    startedAt: number;
    /** Ürünlerin en uzun hazırlanma süresi (dk); hiçbirinde yoksa null → süre çubuğu yok. */
    prepMinutes: number | null;
    /** Bileti ilk gördüğümüz an (yeni gelen ürünlerde ekrana düştüğü an). */
    seenAt: number;
}

export interface TicketTimer {
    elapsedMs: number;
    /** 0..∞ — hedef süreye oran. */
    ratio: number;
    state: 'ok' | 'soon' | 'late';
    /** Kalan (ok/soon) ya da aşılan (late) tam dakika. */
    minutes: number;
}

export function ticketTimer(ticket: Ticket, now: number): TicketTimer | null {
    if (ticket.prepMinutes == null || ticket.prepMinutes <= 0) return null;
    const elapsedMs = Math.max(0, now - ticket.startedAt);
    const targetMs = ticket.prepMinutes * 60_000;
    const ratio = elapsedMs / targetMs;
    if (ratio > 1) return { elapsedMs, ratio, state: 'late', minutes: Math.max(1, Math.floor((elapsedMs - targetMs) / 60_000)) };
    return { elapsedMs, ratio, state: ratio >= 0.75 ? 'soon' : 'ok', minutes: Math.ceil((targetMs - elapsedMs) / 60_000) };
}

// "07:12", bir saati geçince "1:05:20".
export function formatClock(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Siparişleri biletlere böler: her sipariş içindeki ürünler eklendikleri tura göre gruplanır.
// Rayda: en az bir bekleyen ürünü olan biletler (yeniden eskiye: en yeni solda). Pasada: bütün ürünleri hazır olanlar
// (eskiden yeniye: garsonun en uzun beklettiği tabak solda).
export function buildTickets(orders: Order[], seen: Record<string, number>): { rail: Ticket[]; pass: Ticket[] } {
    const rail: Ticket[] = [];
    const pass: Ticket[] = [];

    for (const order of orders) {
        const items = order.orderItems
            .filter(isOnKitchenScreen)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        let current: OrderItem[] = [];
        let roundStart = 0;
        const flush = () => {
            if (current.length === 0) return;
            const prepValues = current.map(i => i.prepMinutes).filter((p): p is number => p != null && p > 0);
            const ticket: Ticket = {
                key: `${order.id}:${current[0].id}`,
                order,
                items: current,
                startedAt: roundStart,
                prepMinutes: prepValues.length > 0 ? Math.max(...prepValues) : null,
                seenAt: Math.min(...current.map(i => seen[String(i.id)] ?? 0)),
            };
            (current.some(isWaiting) ? rail : pass).push(ticket);
            current = [];
        };

        for (const item of items) {
            const t = new Date(item.createdAt).getTime();
            if (current.length > 0 && t - roundStart > ROUND_GAP_MS) flush();
            if (current.length === 0) roundStart = t;
            current.push(item);
        }
        flush();
    }

    const oldestFirst = (a: Ticket, b: Ticket) => a.startedAt - b.startedAt;
    return { rail: rail.sort((a, b) => oldestFirst(b, a)), pass: pass.sort(oldestFirst) };
}

export const itemCountText = (items: OrderItem[]) => `${items.reduce((s, i) => s + i.quantity, 0)} ürün`;
