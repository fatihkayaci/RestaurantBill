import type { ItemsReadyEvent } from '@/features/orders/types';

// Başlıktaki uyarı bileşeni (ItemReadyAlerts) ile masalar sayfası arasındaki pencere olayları.

/** Mutfaktan ürün hazır geldi; masalar sayfası o masanın kartını kısa süre vurgular. detail: ItemsReadyEvent */
export const ITEMS_READY_EVENT = 'rb:items-ready';

/** Toast'taki "Masaya git": masalar sayfası masayı açar. detail: tableId */
export const OPEN_TABLE_EVENT = 'rb:open-table';

export function emitItemsReady(event: ItemsReadyEvent) {
    window.dispatchEvent(new CustomEvent<ItemsReadyEvent>(ITEMS_READY_EVENT, { detail: event }));
}

export function emitOpenTable(tableId: string) {
    window.dispatchEvent(new CustomEvent<string>(OPEN_TABLE_EVENT, { detail: tableId }));
}
