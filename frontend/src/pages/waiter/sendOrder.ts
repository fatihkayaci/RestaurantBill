import { orderService } from '@/features/orders/api/orderService';
import { tableService } from '@/features/tables/api/tableService';
import type { Order } from '@/features/orders/types';
import { lineNote, type CartLine } from './orderCart';

// "Mutfağa gönder":
//   1. Masada sipariş yoksa POST /table/open (dönen değer yeni siparişin kimliği). Bu adım başarısızsa hiçbir şey gitmez.
//   2. Ürünler ve menüler tek POST /order/add-lines isteğinde gider: ya hepsi kaydedilir ya hiçbiri. (Eskiden ürünler ve
//      her menü ayrı ve paralel isteklerdi; aynı siparişi aynı anda güncelledikleri için biri çakışıp kaybolabiliyordu.)
// Hata olursa fırlatır; çağıran sepeti olduğu gibi bırakır.

/** Gönderime hazır menü satırı (seçimler menünün güncel bölümlerine göre süzülmüş). */
export interface SetLineToSend {
    setMenuId: string;
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

export async function sendToKitchen({ tableId, order, orderNote, lines, setLines, onTableOpened }: SendInput): Promise<void> {
    let orderId = order?.id;
    if (orderId == null) {
        // Masa başka bir garson tarafından az önce açıldıysa sunucu mevcut siparişi döner.
        orderId = await tableService.openTable(tableId);
        onTableOpened();
    }

    await orderService.addLines({
        orderId,
        note: orderNote,
        products: lines.map(line => ({
            productId: line.productId,
            quantity: line.quantity,
            note: lineNote(line),
        })),
        setMenus: setLines.map(line => ({
            setMenuId: line.setMenuId,
            quantity: line.quantity,
            note: line.note.trim() || undefined,
            selections: line.selections,
        })),
    });
}
