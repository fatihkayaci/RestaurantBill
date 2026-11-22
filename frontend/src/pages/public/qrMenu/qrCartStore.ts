import { MAX_LINE_QUANTITY, productKey, setMenuKey, type DeliveryCartLine } from '@/features/delivery/deliveryCart';
import { getTenantSlug } from '@/lib/tenant';

// Masa sepetinin telefonda saklanması: sayfa yenilenince ya da QR yeniden okutulunca sepet ve sipariş notu geri gelir.
// Anahtar restoran (alt alan adı) + masa; şube de saklanır, masa başka şubeye taşınmışsa sepet atılır. Sipariş
// gönderilince silinir. Ertesi güne kalan sepet anlamsız olduğu için birkaç saat sonra kendiliğinden düşer.

const TTL_MS = 6 * 60 * 60 * 1000;

interface StoredTableCart {
    branchId: string;
    lines: DeliveryCartLine[];
    note: string;
    savedAt: number;
}

const storageKey = (tableId: string) => `rb:qr-cart:${getTenantSlug() ?? 'dev'}:${tableId}`;

const isLine = (value: unknown): value is DeliveryCartLine => {
    const line = value as DeliveryCartLine | null;
    return !!line && typeof line.key === 'string' && (line.kind === 'product' || line.kind === 'setMenu')
        && typeof line.quantity === 'number' && line.quantity > 0 && typeof line.unitPrice === 'number';
};

/** Saklanan sepet; yoksa, süresi geçmişse ya da başka şubeninse null. */
export function loadTableCart(tableId: string, branchId: string, now = Date.now()): { lines: DeliveryCartLine[]; note: string } | null {
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey(tableId)) ?? 'null') as StoredTableCart | null;
        if (!stored || stored.branchId !== branchId || !Array.isArray(stored.lines)) return null;
        if (now - (stored.savedAt ?? 0) > TTL_MS) return null;
        const lines = stored.lines.filter(isLine).map(line => ({
            ...line, note: line.note ?? '', selections: line.selections ?? {}, selectionNames: line.selectionNames ?? [],
            takeaway: line.takeaway === true,
        }));
        return { lines, note: typeof stored.note === 'string' ? stored.note : '' };
    } catch {
        return null;
    }
}

export function saveTableCart(tableId: string, branchId: string, lines: DeliveryCartLine[], note: string) {
    try {
        if (lines.length === 0 && !note.trim()) localStorage.removeItem(storageKey(tableId));
        else localStorage.setItem(storageKey(tableId), JSON.stringify({ branchId, lines, note, savedAt: Date.now() } satisfies StoredTableCart));
    } catch {
        // Özel pencere / dolu depolama: sepet yalnız bu sayfada kalır.
    }
}

export function clearTableCart(tableId: string) {
    try { localStorage.removeItem(storageKey(tableId)); } catch { /* yok say */ }
}

// ── Satır anahtarı ve "Paket olsun" ─────────────────────────────────────────────────────────────

/**
 * Masa sepeti satırının anahtarı: ürün (ya da menü + seçimler), paket işareti ve not. Aynı ürün paket ve masada,
 * ya da farklı notla ayrı satır olur; aynıları tek satırda toplanır.
 */
export function tableLineKey(line: Pick<DeliveryCartLine, 'kind' | 'productId' | 'setMenuId' | 'selections' | 'note' | 'takeaway'>): string {
    const base = line.kind === 'setMenu' ? setMenuKey(line.setMenuId ?? '', line.selections) : productKey(line.productId ?? '');
    const note = line.note.trim();
    return `${base}${line.takeaway ? '|paket' : ''}${note ? `:${note}` : ''}`;
}

/** Satırın "Paket olsun" işaretini değiştirir; aynı anahtarlı satır zaten varsa adetler o satırda toplanır. */
export function setLineTakeaway(lines: DeliveryCartLine[], key: string, takeaway: boolean): DeliveryCartLine[] {
    const line = lines.find(l => l.key === key);
    if (!line || !!line.takeaway === takeaway) return lines;
    const next = { ...line, takeaway, key: tableLineKey({ ...line, takeaway }) };
    const twin = lines.find(l => l.key === next.key && l.key !== key);
    if (twin) {
        return lines
            .filter(l => l.key !== key)
            .map(l => l === twin ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + line.quantity) } : l);
    }
    return lines.map(l => l.key === key ? next : l);
}
