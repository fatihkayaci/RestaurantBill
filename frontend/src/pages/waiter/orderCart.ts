import type { Order, OrderItem } from '@/features/orders/types';
import { parseUtc } from './waiterUi';

// Garson sepeti. Bir ürün birden çok satırda olabilir: "1 acılı + 1 acısız Adana" iki satırdır.
// Satırın kimliği ürün + nottur; aynı ürün ve aynı notlu satırlar gönderilirken birleşir.
// Fonksiyonlar saftır: eski diziyi değiştirmez, yenisini döner.

export interface CartLine {
    /** Yalnızca ekranda satırı ayırt etmek için (React key, düzenleme). */
    id: string;
    productId: string;
    quantity: number;
    /** Seçili hızlı notlar, ör. ["Acısız"]. */
    chips: string[];
    /** Elle yazılan not. */
    text: string;
}

let lineSeq = 0;

function newLine(productId: string, quantity = 1, chips: string[] = [], text = ''): CartLine {
    lineSeq += 1;
    return { id: `${Date.now().toString(36)}-${lineSeq}`, productId, quantity, chips, text };
}

/** Mutfağa giden not: hızlı notlar + yazılan not, virgülle. */
export function lineNote(line: Pick<CartLine, 'chips' | 'text'>): string {
    return [...line.chips, line.text.trim()].filter(Boolean).join(', ');
}

function lineKey(line: CartLine): string {
    return `${line.productId}|${lineNote(line)}`;
}

function lastLineOf(lines: CartLine[], productId: string): CartLine | undefined {
    return lines.filter(l => l.productId === productId).at(-1);
}

/** Satır tıklaması ve "+": ürünün son satırına 1 ekler, satır yoksa açar. */
export function addOne(lines: CartLine[], productId: string): CartLine[] {
    const last = lastLineOf(lines, productId);
    if (!last) return [...lines, newLine(productId)];
    return changeQuantity(lines, last.id, 1);
}

/** Satırdaki "−": ürünün son satırından 1 düşer. */
export function removeOne(lines: CartLine[], productId: string): CartLine[] {
    const last = lastLineOf(lines, productId);
    return last ? changeQuantity(lines, last.id, -1) : lines;
}

/** Adedi değiştirir; 0'a inen satır silinir. */
export function changeQuantity(lines: CartLine[], lineId: string, delta: number): CartLine[] {
    return lines
        .map(l => (l.id === lineId ? { ...l, quantity: l.quantity + delta } : l))
        .filter(l => l.quantity > 0);
}

/** "Ayrı notla ekle": aynı üründen notsuz yeni bir satır açar. */
export function addSeparateLine(lines: CartLine[], productId: string): CartLine[] {
    return [...lines, newLine(productId)];
}

export function toggleChip(lines: CartLine[], lineId: string, chip: string): CartLine[] {
    return lines.map(l => {
        if (l.id !== lineId) return l;
        const chips = l.chips.includes(chip) ? l.chips.filter(c => c !== chip) : [...l.chips, chip];
        return { ...l, chips };
    });
}

export function setLineText(lines: CartLine[], lineId: string, text: string): CartLine[] {
    return lines.map(l => (l.id === lineId ? { ...l, text } : l));
}

/** Aynı ürün + aynı notlu satırları tek satırda toplar (ilk satırın yeri ve kimliği kalır). */
export function mergeLines(lines: CartLine[]): CartLine[] {
    const byKey = new Map<string, CartLine>();
    for (const line of lines) {
        const key = lineKey(line);
        const existing = byKey.get(key);
        byKey.set(key, existing ? { ...existing, quantity: existing.quantity + line.quantity } : line);
    }
    return [...byKey.values()];
}

// Bir "Mutfağa gönder" tek istekte kaydedilir; satırların createdAt'i milisaniyelerle ayrışabilir.
const ROUND_WINDOW_MS = 5_000;

/** Siparişin son turu: en yeni createdAt'e 5 sn yakın kalemler. */
export function lastRound(order: Order | null): OrderItem[] {
    const items = order?.orderItems ?? [];
    if (items.length === 0) return [];
    const times = items.map(i => parseUtc(i.createdAt));
    const latest = Math.max(...times);
    return items.filter((_, i) => times[i] >= latest - ROUND_WINDOW_MS);
}

/**
 * "Aynısından": kalemleri sepet satırına çevirir. Notun hızlı not olan parçaları çip olarak,
 * kalanı yazılı not olarak gelir. Menüde artık olmayan ürün atlanır. Menü satırları (setMenuId dolu,
 * productId boş) burada atlanır; onları setMenuCart.setLinesFromItems çevirir.
 */
export function linesFromItems(items: OrderItem[], quickNotesOf: (productId: string) => string[] | null): CartLine[] {
    const lines: CartLine[] = [];
    for (const item of items) {
        if (item.setMenuId) continue;
        const quickNotes = quickNotesOf(item.productId);
        if (!quickNotes) continue;
        const parts = item.note.split(',').map(p => p.trim()).filter(Boolean);
        const chips = parts.filter(p => quickNotes.includes(p));
        const text = parts.filter(p => !quickNotes.includes(p)).join(', ');
        lines.push(newLine(item.productId, item.quantity, chips, text));
    }
    return lines;
}
