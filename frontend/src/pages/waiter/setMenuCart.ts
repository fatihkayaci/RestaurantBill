import type { OrderItem } from '@/features/orders/types';
import type { SetMenu, SetMenuOption, SetMenuSlot } from '@/features/setMenus/types';

// Garson sepetindeki menü satırları ("Adana Menü"). Ürün satırlarından ayrı tutulur: kimlikleri ürün değil,
// menü + seçimler + nottur. Aynı menü, aynı seçimler ve aynı notla eklenince adet artar.
// Fonksiyonlar saftır: eski diziyi değiştirmez, yenisini döner.

/** Seçmeli bölümlerdeki seçimler: bölüm id → ürün id. Sabit bölümler yazılmaz. */
export type Selections = Record<string, string>;

export interface SetCartLine {
    /** Yalnızca ekranda satırı ayırt etmek için (React key, düzenleme). */
    id: string;
    setMenuId: string;
    selections: Selections;
    quantity: number;
    note: string;
}

let lineSeq = 0;

function newSetLine(setMenuId: string, selections: Selections, quantity = 1, note = ''): SetCartLine {
    lineSeq += 1;
    return { id: `set-${Date.now().toString(36)}-${lineSeq}`, setMenuId, selections, quantity, note };
}

function setLineKey(line: Pick<SetCartLine, 'setMenuId' | 'selections' | 'note'>): string {
    const selections = Object.entries(line.selections).sort().map(([slot, product]) => `${slot}:${product}`).join(',');
    return `${line.setMenuId}|${selections}|${line.note.trim()}`;
}

/** Garsonun seçim yapacağı bölümler (birden çok seçenekli). */
export function choiceSlots(setMenu: SetMenu): SetMenuSlot[] {
    return setMenu.slots.filter(slot => !slot.isFixed);
}

/** Seçmeli bölümlerin satıştaki varsayılanları; varsayılanı olmayan bölüm boş kalır. */
export function presetSelections(setMenu: SetMenu): Selections {
    const selections: Selections = {};
    for (const slot of choiceSlots(setMenu)) {
        const option = slot.options.find(o => o.isDefault && o.isProductActive);
        if (option) selections[slot.id] = option.productId;
    }
    return selections;
}

/**
 * Her seçmeli bölümün varsayılanı. Bir bölümün varsayılanı yoksa (ya da ürünü satış dışıysa) null döner:
 * o menü tek dokunuşla eklenemez, seçim penceresi açılır.
 */
export function defaultSelections(setMenu: SetMenu): Selections | null {
    const selections = presetSelections(setMenu);
    return isComplete(setMenu, selections) ? selections : null;
}

/** Bir bölümde seçili seçenek; sabit bölümde tek seçenek. */
export function chosenOption(slot: SetMenuSlot, selections: Selections): SetMenuOption | undefined {
    if (slot.isFixed) return slot.options[0];
    return slot.options.find(o => o.productId === selections[slot.id]);
}

/** Her seçmeli bölümde satıştaki bir seçenek seçili mi? */
export function isComplete(setMenu: SetMenu, selections: Selections): boolean {
    return choiceSlots(setMenu).every(slot => chosenOption(slot, selections)?.isProductActive);
}

/** Ekranda gösterilen birim fiyat: menü fiyatı + seçilen seçeneklerin ek ücretleri. Geçerli olan sunucunun hesabıdır. */
export function setUnitPrice(setMenu: SetMenu, selections: Selections): number {
    return setMenu.price + choiceSlots(setMenu).reduce((sum, slot) => sum + (chosenOption(slot, selections)?.surcharge ?? 0), 0);
}

/** Sepet satırının özeti: seçilenler ve not, ör. "Kola · acısız". */
export function setLineSummary(setMenu: SetMenu, line: Pick<SetCartLine, 'selections' | 'note'>): string {
    const chosen = choiceSlots(setMenu).map(slot => chosenOption(slot, line.selections)?.productName).filter(Boolean);
    return [...chosen, line.note.trim()].filter(Boolean).join(' · ');
}

/** Menüyü sepete ekler; aynı seçimli ve aynı notlu satır varsa adedini artırır. */
export function addSet(lines: SetCartLine[], setMenuId: string, selections: Selections, note = ''): SetCartLine[] {
    const key = setLineKey({ setMenuId, selections, note });
    const same = lines.find(l => setLineKey(l) === key);
    if (same) return changeSetQuantity(lines, same.id, 1);
    return [...lines, newSetLine(setMenuId, selections, 1, note)];
}

/** Satır dokunuşu ve "+": menünün son satırına 1 ekler (aynı seçimlerle); satır yoksa verilen seçimlerle açar. */
export function addOneSet(lines: SetCartLine[], setMenuId: string, selections: Selections): SetCartLine[] {
    const last = lines.filter(l => l.setMenuId === setMenuId).at(-1);
    return last ? changeSetQuantity(lines, last.id, 1) : addSet(lines, setMenuId, selections);
}

/** Ürün satırındaki "−" gibi: menünün son satırından 1 düşer. */
export function removeOneSet(lines: SetCartLine[], setMenuId: string): SetCartLine[] {
    const last = lines.filter(l => l.setMenuId === setMenuId).at(-1);
    return last ? changeSetQuantity(lines, last.id, -1) : lines;
}

/** Adedi değiştirir; 0'a inen satır silinir. */
export function changeSetQuantity(lines: SetCartLine[], lineId: string, delta: number): SetCartLine[] {
    return lines
        .map(l => (l.id === lineId ? { ...l, quantity: l.quantity + delta } : l))
        .filter(l => l.quantity > 0);
}

/** "Değiştir" penceresinden: satırın seçimlerini ve notunu günceller. */
export function updateSetLine(lines: SetCartLine[], lineId: string, change: Partial<Pick<SetCartLine, 'selections' | 'note'>>): SetCartLine[] {
    return lines.map(l => (l.id === lineId ? { ...l, ...change } : l));
}

/** Aynı menü + seçim + notlu satırları tek satırda toplar (ilk satırın yeri ve kimliği kalır). */
export function mergeSetLines(lines: SetCartLine[]): SetCartLine[] {
    const byKey = new Map<string, SetCartLine>();
    for (const line of lines) {
        const key = setLineKey(line);
        const existing = byKey.get(key);
        byKey.set(key, existing ? { ...existing, quantity: existing.quantity + line.quantity } : line);
    }
    return [...byKey.values()];
}

/**
 * "Aynısından": siparişteki menü satırlarını sepet satırına çevirir. Seçimler satırın içindeki ürünlerden
 * (components) okunur. Menü artık satışta değilse ya da bir seçim çıkarılamıyorsa satır atlanır.
 */
export function setLinesFromItems(items: OrderItem[], setMenuById: Map<string, SetMenu>): SetCartLine[] {
    const lines: SetCartLine[] = [];
    for (const item of items) {
        const setMenu = item.setMenuId ? setMenuById.get(item.setMenuId) : undefined;
        if (!setMenu) continue;

        // Aynı ürün iki bölümde olabilir; eşleşen içerik bir kez kullanılsın diye listeden düşülür.
        const remaining = (item.components ?? []).map(c => c.productId);
        const selections: Selections = {};
        for (const slot of choiceSlots(setMenu)) {
            const index = remaining.findIndex(productId => slot.options.some(o => o.productId === productId));
            if (index === -1) break;
            selections[slot.id] = remaining[index];
            remaining.splice(index, 1);
        }
        if (!isComplete(setMenu, selections)) continue;
        lines.push(newSetLine(setMenu.id, selections, item.quantity, item.note));
    }
    return lines;
}

/** Gönderim gövdesi için seçimler; menüde artık olmayan bölümler gönderilmez. */
export function selectionsToSend(setMenu: SetMenu, selections: Selections): { slotId: string; productId: string }[] {
    return choiceSlots(setMenu)
        .filter(slot => selections[slot.id])
        .map(slot => ({ slotId: slot.id, productId: selections[slot.id] }));
}
