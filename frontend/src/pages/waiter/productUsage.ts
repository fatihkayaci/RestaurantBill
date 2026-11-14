// "Sık satılanlar": bu cihazdan mutfağa gönderilen ürün ve menü adetleri (localStorage).
// Menüler de ürünler gibi kendi id'leriyle sayılır (ürün ve menü id'leri çakışmaz).
// Sayaç yalnızca başarılı gönderimde artar. Depolama kapalıysa liste boş kalır, "Tümü" açılır.

const USAGE_KEY = 'rb.waiter.productUsage';
const FREQUENT_LIMIT = 12;

type Usage = Record<string, number>;

export function readUsage(): Usage {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(USAGE_KEY) ?? '{}');
        return parsed && typeof parsed === 'object' ? (parsed as Usage) : {};
    } catch {
        return {};
    }
}

export function bumpUsage(sent: { id: string; quantity: number }[]): void {
    try {
        const usage = readUsage();
        for (const { id, quantity } of sent) usage[id] = (usage[id] ?? 0) + quantity;
        localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    } catch { /* yoksay */ }
}

/** En çok gönderilen 12 kayıt (ürün veya menü), çoktan aza. */
export function frequentItems<T extends { id: string }>(items: T[], usage: Usage): T[] {
    return items
        .filter(p => (usage[p.id] ?? 0) > 0)
        .sort((a, b) => usage[b.id] - usage[a.id])
        .slice(0, FREQUENT_LIMIT);
}
