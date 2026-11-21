/**
 * Kayıtlı kart sırasını güncel katalogla birleştirir: bilinmeyen (kaldırılmış) kimlikler atılır,
 * tekrarlar silinir, kayıtta olmayan (yeni eklenmiş) kartlar katalog sırasıyla sona eklenir.
 */
export function mergeOrder<T extends string>(saved: readonly string[] | null | undefined, all: readonly T[]): T[] {
    const known = new Set<string>(all);
    const order: T[] = [];
    for (const id of saved ?? []) {
        if (known.has(id) && !order.includes(id as T)) order.push(id as T);
    }
    for (const id of all) if (!order.includes(id)) order.push(id);
    return order;
}

export const sameOrder = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((id, i) => id === b[i]);
