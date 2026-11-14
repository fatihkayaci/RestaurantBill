import { orderService } from '@/features/orders/api/orderService';
import { setMenuService } from '@/features/setMenus/api/setMenuService';
import { tableService } from '@/features/tables/api/tableService';
import type { Order } from '@/features/orders/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { lineNote, type CartLine } from './orderCart';

// "Mutfağa gönder":
//   1. Masada sipariş yoksa POST /table/open (dönen değer yeni siparişin kimliği). Bu adım başarısızsa hiçbir şey gitmez.
//   2. Sipariş kimliği belli olunca aynı anda: ürünler tek addItems isteğinde, her menü satırı kendi
//      addSetMenuToOrder isteğinde. Biri başarısız olsa da diğerleri kaydedilir; başarısızlar geri döner.

/** Gönderime hazır menü satırı (seçimler menünün güncel bölümlerine göre süzülmüş). */
export interface SetLineToSend {
    /** Sepetteki satırın id'si; başarısız olursa sepette bu satır kalır. */
    lineId: string;
    setMenuId: string;
    name: string;
    quantity: number;
    note: string;
    selections: { slotId: string; productId: string }[];
}

interface SendInput {
    tableId: string;
    order: Order | null;
    orderNote: string;
    /** Birleştirilmiş, menüde olan ürün satırları. */
    lines: CartLine[];
    setLines: SetLineToSend[];
    /** Masa bu gönderimle açıldıysa (liste hemen "Dolu" görsün diye). */
    onTableOpened: () => void;
}

export interface SendFailure {
    /** "Ürünler" ya da menünün adı. */
    label: string;
    message: string;
    /** Ürün isteği başarısızsa true (tüm ürün satırları sepette kalır). */
    products: boolean;
    /** Menü isteği başarısızsa sepetteki satırın id'si. */
    setLineId?: string;
}

export async function sendToKitchen({ tableId, order, orderNote, lines, setLines, onTableOpened }: SendInput): Promise<SendFailure[]> {
    let orderId = order?.id;
    if (orderId == null) {
        // Masa başka bir garson tarafından az önce açıldıysa sunucu mevcut siparişi döner.
        orderId = await tableService.openTable(tableId);
        onTableOpened();
    }

    const productRequest = lines.length === 0 ? null : orderService.addItems(orderId, orderNote, lines.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        note: lineNote(line),
    })));
    const setRequests = setLines.map(line => setMenuService.addSetMenuToOrder({
        orderId: orderId,
        setMenuId: line.setMenuId,
        quantity: line.quantity,
        note: line.note.trim() || undefined,
        selections: line.selections,
    }));

    const [productResult, ...setResults] = await Promise.allSettled([productRequest, ...setRequests]);

    const failures: SendFailure[] = [];
    if (productResult.status === 'rejected') {
        failures.push({ label: 'Ürünler', message: getApiErrorMessage(productResult.reason, 'Ürünler gönderilemedi.'), products: true });
    }
    setResults.forEach((result, index) => {
        if (result.status === 'fulfilled') return;
        const line = setLines[index];
        failures.push({ label: line.name, message: getApiErrorMessage(result.reason, `${line.name} gönderilemedi.`), products: false, setLineId: line.lineId });
    });
    return failures;
}
