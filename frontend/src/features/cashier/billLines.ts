import type { OrderItem } from '@/features/orders/types';
import type { PaymentItem } from './api/paymentService';

/**
 * Hesap ekranındaki satır: aynı ürünün farklı turlarda (mutfağa ayrı gönderilmiş) kalemleri tek satırda toplanır.
 * Aynı ürün/menü, aynı birim fiyat, aynı KDV, aynı not ve aynı menü seçimleri birleşir; biri farklıysa ayrı satırdır.
 * Ödeme sunucuya yine kalem kalem gider (bkz. buildPayItems).
 */
export interface BillLine {
    key: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    taxRate: number;
    note: string;
    categoryName: string;
    components?: OrderItem[];
    /** Satırı oluşturan sipariş kalemleri, siparişteki sırayla. */
    items: OrderItem[];
}

/** Ürün indirimi: satırın bu ödemede ödenen adetlerine yüzde ya da tutar olarak uygulanır. */
export interface LineDiscount {
    type: 'percent' | 'amount';
    value: number;
}

export const round2 = (value: number) => Math.round(value * 100) / 100;

// Menü seçimleri: bir menü adedine düşen içerik (ürün, adet, not). Adetler satırın adediyle ölçeklenir.
function componentSignature(item: OrderItem): string {
    if (!item.components?.length || item.quantity <= 0) return '';
    return item.components
        .map(c => `${c.productId}×${c.quantity / item.quantity}:${c.note ?? ''}`)
        .sort()
        .join(',');
}

export function groupBillLines(items: OrderItem[]): BillLine[] {
    const lines = new Map<string, BillLine>();
    for (const item of items) {
        const key = [
            item.setMenuId ?? '', item.productId, item.unitPrice, item.taxRate,
            item.note ?? '', item.setMenuNote ?? '', componentSignature(item),
        ].join('|');
        const line = lines.get(key);
        if (line) {
            line.quantity += item.quantity;
            line.items.push(item);
        } else {
            lines.set(key, {
                key,
                productName: item.productName,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                taxRate: item.taxRate,
                note: item.note,
                categoryName: item.categoryName,
                components: item.components,
                items: [item],
            });
        }
    }
    return [...lines.values()];
}

/** Satırdan ödenecek adetleri, satırın kalemlerine sırayla dağıtır. */
export function allocateLine(line: BillLine, quantity: number): { item: OrderItem; quantity: number }[] {
    const pieces: { item: OrderItem; quantity: number }[] = [];
    let left = Math.min(Math.max(quantity, 0), line.quantity);
    for (const item of line.items) {
        if (left <= 0) break;
        const take = Math.min(item.quantity, left);
        pieces.push({ item, quantity: take });
        left -= take;
    }
    return pieces;
}

export interface PayPlan {
    items: PaymentItem[];
    /** Ödenecek kalemlerin brütü. */
    gross: number;
    /** Ürün indirimlerinin toplamı (sunucunun kalem başına yuvarlamasıyla). */
    itemDiscount: number;
    /** Sınırı aşan bir ürün indirimi var mı. */
    lineOverLimit: boolean;
}

/**
 * Ödeme kalemleri: her satırdan ödenecek adet, satırın kalemlerine dağıtılır; ürün indirimi yüzde ise her kaleme aynı
 * yüzde, tutar ise kalemlerin brütüyle orantılı (kuruşa yuvarlı, fark sondaki kaleme) yazılır.
 */
export function buildPayItems(
    lines: BillLine[],
    quantityOf: (line: BillLine) => number,
    discounts: Record<string, LineDiscount>,
    maxDiscountPercent = 100,
): PayPlan {
    const items: PaymentItem[] = [];
    let gross = 0;
    let itemDiscount = 0;
    let lineOverLimit = false;
    for (const line of lines) {
        const pieces = allocateLine(line, quantityOf(line));
        if (pieces.length === 0) continue;
        const lineGross = round2(pieces.reduce((s, p) => s + p.item.unitPrice * p.quantity, 0));
        gross += lineGross;
        const discount = discounts[line.key];
        const value = discount && discount.value > 0 ? discount.value : 0;
        let lineDiscount = 0;
        let allocated = 0;
        pieces.forEach((piece, index) => {
            const pieceGross = round2(piece.item.unitPrice * piece.quantity);
            const entry: PaymentItem = { orderItemId: piece.item.id, quantity: piece.quantity };
            if (value > 0 && discount.type === 'percent') {
                const percent = Math.min(value, 100);
                entry.discountPercent = percent;
                lineDiscount += round2(pieceGross * percent / 100);
            } else if (value > 0) {
                const total = Math.min(value, lineGross);
                const share = index === pieces.length - 1
                    ? round2(total - allocated)
                    : lineGross > 0 ? round2(total * pieceGross / lineGross) : 0;
                allocated = round2(allocated + share);
                if (share > 0) entry.discountAmount = share;
                lineDiscount += share;
            }
            items.push(entry);
        });
        lineDiscount = round2(lineDiscount);
        itemDiscount += lineDiscount;
        if (lineDiscount > round2(lineGross * maxDiscountPercent / 100)) lineOverLimit = true;
    }
    return { items, gross: round2(gross), itemDiscount: round2(itemDiscount), lineOverLimit };
}

/** Satırın ürün indirimi tutarı (gösterim için; ödenen adetlere göre). */
export function lineDiscountAmount(lineGross: number, discount: LineDiscount | undefined): number {
    if (!discount || discount.value <= 0) return 0;
    return discount.type === 'percent'
        ? round2(lineGross * Math.min(discount.value, 100) / 100)
        : Math.min(discount.value, lineGross);
}
