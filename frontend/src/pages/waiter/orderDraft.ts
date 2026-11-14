import type { CartLine } from './orderCart';
import type { SetCartLine } from './setMenuCart';

// Masa başına taslak sepet (sessionStorage). Geri dönünce, masa değişince veya ekran yeniden
// açılınca sepet kaybolmaz; başarılı gönderimde silinir. Sekme kapanınca taslak da gider.
// Depolama kapalıysa (gizli sekme vb.) sessizce çalışmaz; ekran yine çalışır.

export interface OrderDraft {
    lines: CartLine[];
    /** Menü satırları ("Adana Menü"). */
    setLines: SetCartLine[];
    orderNote: string;
}

const DRAFT_PREFIX = 'rb.waiter.draft.';

function isCartLine(value: unknown): value is CartLine {
    const line = value as CartLine;
    return typeof line?.id === 'string'
        && typeof line.productId === 'string'
        && typeof line.quantity === 'number' && line.quantity > 0
        && Array.isArray(line.chips)
        && typeof line.text === 'string';
}

function isSetCartLine(value: unknown): value is SetCartLine {
    const line = value as SetCartLine;
    return typeof line?.id === 'string'
        && typeof line.setMenuId === 'string'
        && typeof line.selections === 'object' && line.selections !== null
        && typeof line.quantity === 'number' && line.quantity > 0
        && typeof line.note === 'string';
}

export function readDraft(tableId: string): OrderDraft | null {
    try {
        const raw = sessionStorage.getItem(DRAFT_PREFIX + tableId);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<OrderDraft>;
        const lines = Array.isArray(parsed.lines) ? parsed.lines.filter(isCartLine) : [];
        const setLines = Array.isArray(parsed.setLines) ? parsed.setLines.filter(isSetCartLine) : [];
        if (lines.length === 0 && setLines.length === 0) return null;
        return { lines, setLines, orderNote: typeof parsed.orderNote === 'string' ? parsed.orderNote : '' };
    } catch {
        return null;
    }
}

/** Sepet boşsa taslağı siler; yalnızca sipariş notu taslak sayılmaz. */
export function writeDraft(tableId: string, draft: OrderDraft): void {
    try {
        if (draft.lines.length === 0 && draft.setLines.length === 0) sessionStorage.removeItem(DRAFT_PREFIX + tableId);
        else sessionStorage.setItem(DRAFT_PREFIX + tableId, JSON.stringify(draft));
    } catch { /* yoksay */ }
}

export function clearDraft(tableId: string): void {
    try { sessionStorage.removeItem(DRAFT_PREFIX + tableId); } catch { /* yoksay */ }
}

/** Masa kartında "gönderilmemiş sepet" rozeti için. */
export function hasDraft(tableId: string): boolean {
    return readDraft(tableId) !== null;
}
