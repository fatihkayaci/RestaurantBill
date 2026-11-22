import type { PublicTableBill } from '@/features/customerSite/types';

/** Hesabın satırları: satır anahtarı (ad, menü içeriği, not, paket) → ad ve toplam adet. */
export type BillSnapshot = Map<string, { name: string; quantity: number }>;

/** Açık hesabın satırları; hesap yoksa ya da ödendiyse boş (ödenen hesaptan yeni hesaba geçiş "eklendi" sayılır). */
export function snapshotBill(bill: PublicTableBill): BillSnapshot {
    const snapshot: BillSnapshot = new Map();
    if (!bill.hasBill || bill.isPaid) return snapshot;
    for (const line of bill.items) {
        const key = [line.name, (line.details ?? []).join('+'), line.note ?? '',line.isTakeaway ? 'paket' : ''].join('|');
        const current = snapshot.get(key);
        snapshot.set(key, { name: line.name, quantity: (current?.quantity ?? 0) + line.quantity });
    }
    return snapshot;
}

/** Yeni hesapta artan adetler, ada göre toplanmış (ekleniş sırasıyla). Azalan ve silinen satırlar sayılmaz. */
export function addedLines(previous: BillSnapshot, next: BillSnapshot): Map<string, number> {
    const added = new Map<string, number>();
    for (const [key, line] of next) {
        const delta = line.quantity - (previous.get(key)?.quantity ?? 0);
        if (delta > 0) added.set(line.name, (added.get(line.name) ?? 0) + delta);
    }
    return added;
}

/**
 * Bu telefonun kendi talebinin kalemlerini eklenenlerden düşer (onaylanınca hesaba yazılırlar; onlar için "onaylandı"
 * bildirimi var). Talep kaleminin adı menüde "Menü (seçim, seçim)" biçimindedir, hesapta yalnız menünün adı:
 * önce tam ad, yoksa parantezden önceki kısım eşlenir. true: en az bir kalem düşüldü.
 */
export function subtractOwnItems(added: Map<string, number>, items: { name: string; quantity: number }[]): boolean {
    let matched = false;
    for (const item of items) {
        const base = item.name.includes(' (') ? item.name.slice(0, item.name.indexOf(' (')) : item.name;
        const name = added.has(item.name) ? item.name : added.has(base) ? base : null;
        if (!name) continue;
        const left = (added.get(name) ?? 0) - item.quantity;
        if (left > 0) added.set(name, left); else added.delete(name);
        matched = true;
    }
    return matched;
}

/** "Masanıza eklendi: 2× Çay, 1× Su"; uzunsa "Masanıza 4 ürün eklendi". Boşsa null. */
export function addedText(added: Map<string, number>): string | null {
    const entries = [...added.entries()].filter(([, quantity]) => quantity > 0);
    if (entries.length === 0) return null;
    const list = entries.map(([name, quantity]) => `${quantity}× ${name}`).join(', ');
    if (entries.length <= 3 && list.length <= 36) return `Masanıza eklendi: ${list}`;
    const total = entries.reduce((sum, [, quantity]) => sum + quantity, 0);
    return `Masanıza ${total} ürün eklendi`;
}
