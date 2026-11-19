// Online paket sipariş sepetinin saf yardımcıları (React yok): satır ekleme/çıkarma, sunucuya giden satırlar, cihazda
// saklama ve telefon maskesi. Fiyatlar burada yalnızca tahmindir; gösterilen toplam sunucunun teklifidir (quote).
import { getTenantSlug } from '@/lib/tenant';
import type { CartLineInput, OnlineMenuCategory, OnlineSetMenu } from './types';

export const MAX_LINE_QUANTITY = 50;
export const MAX_LINES = 50;

export interface DeliveryCartLine {
    /** Ürün: "p:<id>"; menü: "s:<id>:<seçimler>". Aynı seçimli menüler tek satırda toplanır. */
    key: string;
    kind: 'product' | 'setMenu';
    productId?: string;
    setMenuId?: string;
    name: string;
    /** Tahmini birim fiyat (menüde seçim farkları dahil). */
    unitPrice: number;
    quantity: number;
    note: string;
    /** Menü: bölüm → ürün. */
    selections: Record<string, string>;
    /** Menü: seçilen ürünlerin adları (sepette gösterilir). */
    selectionNames: string[];
}

export function productKey(productId: string): string {
    return `p:${productId}`;
}

export function setMenuKey(setMenuId: string, selections: Record<string, string>): string {
    const parts = Object.entries(selections).sort(([a], [b]) => a.localeCompare(b)).map(([slot, product]) => `${slot}=${product}`);
    return `s:${setMenuId}:${parts.join(',')}`;
}

/** Satırı ekler ya da adedini artırır (en fazla 50; en fazla 50 satır). */
export function addLine(lines: DeliveryCartLine[], line: Omit<DeliveryCartLine, 'quantity'>, quantity = 1): DeliveryCartLine[] {
    const existing = lines.find(l => l.key === line.key);
    if (existing) {
        return lines.map(l => l.key === line.key ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + quantity) } : l);
    }
    if (lines.length >= MAX_LINES) return lines;
    return [...lines, { ...line, quantity: Math.min(MAX_LINE_QUANTITY, quantity) }];
}

/** Satırı listenin sonuna taşır (son eklenen; sipariş panelinde en üstte gösterilir). */
export function moveLineToEnd(lines: DeliveryCartLine[], key: string): DeliveryCartLine[] {
    const line = lines.find(l => l.key === key);
    return line ? [...lines.filter(l => l.key !== key), line] : lines;
}

/** Adedi değiştirir; 0 ya da altı satırı siler. */
export function changeQuantity(lines: DeliveryCartLine[], key: string, delta: number): DeliveryCartLine[] {
    return lines
        .map(l => l.key === key ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + delta) } : l)
        .filter(l => l.quantity > 0);
}

/** Menünün (set) son eklenen satırını bir azaltır (farklı seçimli satırlar olabilir; en son eklenen önce düşer). */
export function removeOneSetMenu(lines: DeliveryCartLine[], setMenuId: string): DeliveryCartLine[] {
    const last = [...lines].reverse().find(l => l.kind === 'setMenu' && l.setMenuId === setMenuId);
    return last ? changeQuantity(lines, last.key, -1) : lines;
}

export function setLineNote(lines: DeliveryCartLine[], key: string, note: string): DeliveryCartLine[] {
    return lines.map(l => l.key === key ? { ...l, note } : l);
}

export function quantityOf(lines: DeliveryCartLine[], predicate: (line: DeliveryCartLine) => boolean): number {
    return lines.filter(predicate).reduce((sum, l) => sum + l.quantity, 0);
}

export function itemCount(lines: DeliveryCartLine[]): number {
    return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function estimatedSubtotal(lines: DeliveryCartLine[]): number {
    return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

export function toCartInput(lines: DeliveryCartLine[]): CartLineInput[] {
    return lines.map(l => l.kind === 'product'
        ? { kind: 'product', productId: l.productId, quantity: l.quantity, note: l.note.trim() || undefined, selections: [] }
        : {
            kind: 'setMenu',
            setMenuId: l.setMenuId,
            quantity: l.quantity,
            note: l.note.trim() || undefined,
            selections: Object.entries(l.selections).map(([slotId, productId]) => ({ slotId, productId })),
        });
}

/** Menüde artık olmayan ya da tükenen ürünler/menüler sepetten düşer; kaç satır düştüğü döner. */
export function pruneUnavailable(lines: DeliveryCartLine[], categories: OnlineMenuCategory[], setMenus: OnlineSetMenu[]):
    { lines: DeliveryCartLine[]; removed: number } {
    const products = new Map(categories.flatMap(c => c.products).map(p => [p.id, p]));
    const menus = new Map(setMenus.map(s => [s.id, s]));
    const kept = lines.filter(line => {
        if (line.kind === 'product') {
            const product = line.productId ? products.get(line.productId) : undefined;
            return !!product && !product.isOutOfStock;
        }
        const menu = line.setMenuId ? menus.get(line.setMenuId) : undefined;
        if (!menu || !menu.isAvailable) return false;
        return Object.entries(line.selections).every(([slotId, productId]) =>
            menu.slots.find(s => s.id === slotId)?.options.some(o => o.productId === productId && o.isAvailable));
    });
    return { lines: kept, removed: lines.length - kept.length };
}

// ── Menü seçimi ───────────────────────────────────────────────────────────────────────────────

/** Her bölümün başlangıç seçimi: seçilebilir varsayılan, yoksa ilk seçilebilir seçenek. */
export function defaultSelections(menu: OnlineSetMenu): Record<string, string> {
    const result: Record<string, string> = {};
    for (const slot of menu.slots) {
        const option = slot.options.find(o => o.isDefault && o.isAvailable) ?? slot.options.find(o => o.isAvailable);
        if (option) result[slot.id] = option.productId;
    }
    return result;
}

export function setMenuUnitPrice(menu: OnlineSetMenu, selections: Record<string, string>): number {
    let price = menu.price;
    for (const slot of menu.slots) {
        const option = slot.options.find(o => o.productId === selections[slot.id]);
        if (option) price += option.surcharge;
    }
    return price;
}

export function selectionNames(menu: OnlineSetMenu, selections: Record<string, string>): string[] {
    return menu.slots
        .filter(slot => !slot.isFixed || slot.options.length > 1)
        .map(slot => slot.options.find(o => o.productId === selections[slot.id])?.productName)
        .filter((name): name is string => !!name);
}

// ── Cihazda saklama (sepet, şube başına) ──────────────────────────────────────────────────────

const CART_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoredCart {
    lines: DeliveryCartLine[];
    /** Aynı sepetin tekrar gönderimi aynı siparişi döndürür (çift tıklama, bağlantı kopması). */
    clientRequestId: string;
    zoneId: string | null;
    savedAt: number;
}

export function newClientRequestId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        // Eski tarayıcı / güvenli olmayan bağlam: rastgele bir v4 biçimi.
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.floor(Math.random() * 16);
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }
}

const cartKey = (branchId: string) => `rb:delivery-cart:${getTenantSlug() ?? 'dev'}:${branchId}`;

export function loadCart(branchId: string, now = Date.now()): StoredCart | null {
    try {
        const parsed = JSON.parse(localStorage.getItem(cartKey(branchId)) ?? 'null') as StoredCart | null;
        if (!parsed || !Array.isArray(parsed.lines) || typeof parsed.clientRequestId !== 'string') return null;
        if (now - (parsed.savedAt ?? 0) > CART_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveCart(branchId: string, cart: Omit<StoredCart, 'savedAt'>) {
    try {
        if (cart.lines.length === 0 && !cart.zoneId) localStorage.removeItem(cartKey(branchId));
        else localStorage.setItem(cartKey(branchId), JSON.stringify({ ...cart, savedAt: Date.now() }));
    } catch {
        // Özel pencere / dolu depolama: sepet yalnızca bu sayfada kalır.
    }
}

export function clearCart(branchId: string) {
    try { localStorage.removeItem(cartKey(branchId)); } catch { /* yok say */ }
}

const branchKey = () => `rb:delivery-branch:${getTenantSlug() ?? 'dev'}`;

export function loadBranchChoice(): string | null {
    try { return localStorage.getItem(branchKey()); } catch { return null; }
}

export function saveBranchChoice(branchId: string) {
    try { localStorage.setItem(branchKey(), branchId); } catch { /* yok say */ }
}

// ── Bu cihazdan verilen siparişler (takip bağlantıları) ───────────────────────────────────────

export interface RecentDeliveryOrder {
    token: string;
    number: number;
    createdAt: string;
}

const MAX_RECENT = 5;
const recentKey = () => `rb:delivery-orders:${getTenantSlug() ?? 'dev'}`;

export function loadRecentOrders(): RecentDeliveryOrder[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(recentKey()) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.filter((o): o is RecentDeliveryOrder => !!o && typeof o.token === 'string' && typeof o.number === 'number')
            : [];
    } catch {
        return [];
    }
}

export function rememberOrder(order: RecentDeliveryOrder) {
    try {
        const next = [order, ...loadRecentOrders().filter(o => o.token !== order.token)].slice(0, MAX_RECENT);
        localStorage.setItem(recentKey(), JSON.stringify(next));
    } catch { /* yok say */ }
}

export function forgetOrder(token: string) {
    try {
        localStorage.setItem(recentKey(), JSON.stringify(loadRecentOrders().filter(o => o.token !== token)));
    } catch { /* yok say */ }
}

// ── Telefon ───────────────────────────────────────────────────────────────────────────────────

/** Yazılanı "05xx xxx xx xx" biçimine getirir (en fazla 11 rakam, başta 0). "+90" ve "90" önekleri atılır. */
export function formatPhoneInput(raw: string): string {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2);
    if (digits.length > 0 && !digits.startsWith('0')) digits = `0${digits}`;
    digits = digits.slice(0, 11);
    const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean);
    return parts.join(' ');
}

/** "0xxx xxx xx xx": 11 rakam, 0 ile başlar (sunucu sabit hattı da kabul eder; ipucu cep numarasıdır). */
export function isCompletePhone(formatted: string): boolean {
    return /^0[1-9]\d{9}$/.test(formatted.replace(/\D/g, ''));
}

// ── Gönderilen sepetin kopyası ("Tekrar sipariş ver" / reddedilince "Sepete dön") ──────────────

const SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const snapshotKey = (token: string) => `rb:delivery-order-cart:${getTenantSlug() ?? 'dev'}:${token}`;

export interface OrderSnapshot {
    branchId: string;
    lines: DeliveryCartLine[];
    zoneId: string | null;
    savedAt: number;
}

/** Sipariş gönderilince sepet silinmeden önce siparişin anahtarıyla saklanır (7 gün). */
export function saveOrderSnapshot(token: string, branchId: string, lines: DeliveryCartLine[], zoneId: string | null) {
    try {
        localStorage.setItem(snapshotKey(token), JSON.stringify({ branchId, lines, zoneId, savedAt: Date.now() }));
    } catch { /* özel pencere: tekrar sipariş boş sepetle açılır */ }
}

export function loadOrderSnapshot(token: string, now = Date.now()): OrderSnapshot | null {
    try {
        const parsed = JSON.parse(localStorage.getItem(snapshotKey(token)) ?? 'null') as OrderSnapshot | null;
        if (!parsed || !Array.isArray(parsed.lines) || typeof parsed.branchId !== 'string') return null;
        if (now - (parsed.savedAt ?? 0) > SNAPSHOT_TTL_MS) {
            localStorage.removeItem(snapshotKey(token));
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}
