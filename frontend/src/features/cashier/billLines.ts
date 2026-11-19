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

/**
 * Ürün indirimi: satırın bu ödemede ödenen adetlerinden `quantity` kadarına (boşsa tamamına) uygulanır.
 * Yüzde her indirimli adede ayrı uygulanır; tutar ise indirimli adetlerin TOPLAM indirimidir (adet başı değil).
 */
export interface LineDiscount {
    type: 'percent' | 'amount';
    value: number;
    /** İndirimli adet; boşsa ödenen adetlerin tamamı. Ödenen adetten büyükse ödenen adede kırpılır. */
    quantity?: number;
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

/** İndirimin uygulanacağı adet: seçilen adet, ödenen adetle sınırlı; seçilmemişse ödenen adetlerin tamamı. */
export function discountedQuantity(discount: { quantity?: number } | undefined, paidQuantity: number): number {
    if (!discount?.quantity || discount.quantity <= 0) return paidQuantity;
    return Math.min(discount.quantity, paidQuantity);
}

/**
 * Ödeme kalemleri: her satırdan ödenecek adet, satırın kalemlerine dağıtılır. Ürün indirimi ödenen adetlerin ilk
 * N'ine (en eski turdan başlayarak) uygulanır: yüzde ise her kaleme aynı yüzde, tutar ise indirimli adetlerin brütüyle
 * orantılı (kuruşa yuvarlı, fark son indirimli kaleme) yazılır. Kalemin adetlerinin bir kısmı indirimliyse
 * discountQuantity gönderilir.
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
        const paidQuantity = pieces.reduce((s, p) => s + p.quantity, 0);
        let discountLeft = value > 0 ? discountedQuantity(discount, paidQuantity) : 0;
        // Satırın kalemleri aynı birim fiyatlıdır (birleşme anahtarında).
        const discountedGross = round2(line.unitPrice * discountLeft);
        let lineDiscount = 0;
        let allocated = 0;
        for (const piece of pieces) {
            const entry: PaymentItem = { orderItemId: piece.item.id, quantity: piece.quantity };
            const dq = Math.min(piece.quantity, discountLeft);
            discountLeft -= dq;
            if (dq > 0) {
                const pieceGross = round2(piece.item.unitPrice * dq);
                let pieceDiscount = 0;
                if (discount.type === 'percent') {
                    const percent = Math.min(value, 100);
                    entry.discountPercent = percent;
                    pieceDiscount = round2(pieceGross * percent / 100);
                } else {
                    const total = Math.min(value, discountedGross);
                    pieceDiscount = discountLeft === 0
                        ? round2(total - allocated)
                        : discountedGross > 0 ? round2(total * pieceGross / discountedGross) : 0;
                    allocated = round2(allocated + pieceDiscount);
                    if (pieceDiscount > 0) entry.discountAmount = pieceDiscount;
                }
                if (dq < piece.quantity && (entry.discountPercent || entry.discountAmount)) entry.discountQuantity = dq;
                lineDiscount += pieceDiscount;
            }
            items.push(entry);
        }
        lineDiscount = round2(lineDiscount);
        itemDiscount += lineDiscount;
        // Sınır indirimli adetlerin tutarına göre ölçülür (sunucu da öyle yapar).
        if (lineDiscount > round2(discountedGross * maxDiscountPercent / 100)) lineOverLimit = true;
    }
    return { items, gross: round2(gross), itemDiscount: round2(itemDiscount), lineOverLimit };
}

/** Satırın ürün indirimi tutarı (gösterim için): ödenen adetlerden indirimli olanlara göre. */
export function lineDiscountAmount(unitPrice: number, paidQuantity: number, discount: LineDiscount | undefined): number {
    if (!discount || discount.value <= 0 || paidQuantity <= 0) return 0;
    const discountedGross = round2(unitPrice * discountedQuantity(discount, paidQuantity));
    return discount.type === 'percent'
        ? round2(discountedGross * Math.min(discount.value, 100) / 100)
        : Math.min(discount.value, discountedGross);
}

/** İndirimin kısa yazımı: "%50", "1 adede %50", "2 adede ₺20". Tümüne uygulanıyorsa adet yazılmaz. */
export function describeLineDiscount(discount: LineDiscount, paidQuantity: number): string {
    const value = discount.type === 'percent' ? `%${discount.value}` : `₺${discount.value}`;
    const quantity = discountedQuantity(discount, paidQuantity);
    return paidQuantity > 1 && quantity < paidQuantity ? `${quantity} adede ${value}` : value;
}
