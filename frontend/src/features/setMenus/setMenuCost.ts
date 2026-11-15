import { formatPrice } from '@/lib/format';

// Menü fiyatı üzerinden kâr ve marj: "Kâr: ₺77 (%51)". Maliyet bilinmiyorsa (0) gösterilmez.
export function marginText(price: number, cost: number): { text: string; isLoss: boolean } | null {
    if (price <= 0 || cost <= 0) return null;
    const profit = price - cost;
    const margin = Math.round((Math.abs(profit) / price) * 100);
    return {
        text: `${profit < 0 ? 'Zarar' : 'Kâr'}: ₺${formatPrice(Math.abs(profit))} (%${margin})`,
        isLoss: profit < 0,
    };
}
