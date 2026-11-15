// Paket siparişin durumuna göre takip adımları ve pano sütunları (saf yardımcılar).
import { DeliveryStatus, type DeliveryOrder, type DeliveryOrderStatus } from './types';

/** Takip sayfasının adımları: Alındı → Onaylandı → Hazırlanıyor → Yolda → Teslim edildi. */
export const TRACKING_STEPS = ['Alındı', 'Onaylandı', 'Hazırlanıyor', 'Yolda', 'Teslim edildi'] as const;

/** Durumun takip adımındaki yeri (0–4); reddedilen/iptal edilen için -1. Hazır, "Hazırlanıyor" adımında kalır. */
export function trackingStepIndex(status: DeliveryOrderStatus): number {
    switch (status) {
        case DeliveryStatus.Received: return 0;
        case DeliveryStatus.Accepted: return 1;
        case DeliveryStatus.Preparing:
        case DeliveryStatus.Ready: return 2;
        case DeliveryStatus.OnTheWay: return 3;
        case DeliveryStatus.Delivered: return 4;
        default: return -1;
    }
}

/** Son durum: takip sayfası yoklamayı durdurur. */
export function isFinalStatus(status: DeliveryOrderStatus): boolean {
    return status === DeliveryStatus.Delivered || status === DeliveryStatus.Rejected || status === DeliveryStatus.Cancelled;
}

// ── Pano ──────────────────────────────────────────────────────────────────────────────────────

export type BoardColumnKey = 'new' | 'preparing' | 'ready' | 'onTheWay' | 'delivered';

export const BOARD_COLUMNS: { key: BoardColumnKey; label: string }[] = [
    { key: 'new', label: 'Yeni' },
    { key: 'preparing', label: 'Hazırlanıyor' },
    { key: 'ready', label: 'Hazır' },
    { key: 'onTheWay', label: 'Yolda' },
    { key: 'delivered', label: 'Teslim edildi' },
];

/** Kabul edilmiş ama mutfağa düşmemiş sipariş de "Hazırlanıyor"dadır. Reddedilen/iptal edilen panoda yok. */
export function boardColumnOf(status: DeliveryOrderStatus): BoardColumnKey | null {
    switch (status) {
        case DeliveryStatus.Received: return 'new';
        case DeliveryStatus.Accepted:
        case DeliveryStatus.Preparing: return 'preparing';
        case DeliveryStatus.Ready: return 'ready';
        case DeliveryStatus.OnTheWay: return 'onTheWay';
        case DeliveryStatus.Delivered: return 'delivered';
        default: return null;
    }
}

/** Açık siparişler (önceki günden kalmış olabilir) ile bugünün listesini birleştirir; aynı sipariş bir kez. */
export function mergeBoardOrders(active: DeliveryOrder[], today: DeliveryOrder[]): DeliveryOrder[] {
    const byId = new Map<string, DeliveryOrder>();
    for (const order of today) byId.set(order.id, order);
    for (const order of active) byId.set(order.id, order);
    return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** "#123 · Moda" */
export function orderTitle(order: Pick<DeliveryOrder, 'number' | 'zoneName'>): string {
    return order.zoneName ? `#${order.number} · ${order.zoneName}` : `#${order.number}`;
}

/** Kalan süre "4:05"; geçtiyse "0:00". */
export function countdownText(untilIso: string, now: number): string {
    const ms = Math.max(0, new Date(untilIso).getTime() - now);
    const totalSeconds = Math.floor(ms / 1000);
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/** "/cashier?sekme=paket" + id → "/cashier?sekme=paket&siparis=id": panoda siparişin detayı açılır. */
export function boardOrderPath(boardPath: string, orderId: string): string {
    return `${boardPath}${boardPath.includes('?') ? '&' : '?'}siparis=${encodeURIComponent(orderId)}`;
}

export const ETA_CHOICES = [20, 30, 45, 60] as const;

export const REJECT_REASONS = [
    'Yoğunluk nedeniyle şu an sipariş alamıyoruz.',
    'Siparişinizdeki ürünlerden biri tükendi.',
    'Adresiniz teslimat bölgemizin dışında.',
    'Kısa süre içinde kapanıyoruz.',
] as const;

export const CANCEL_REASONS = [
    'Müşteri iptal etmek istedi.',
    'Müşteriye ulaşılamadı.',
    'Ürün hazırlanamadı.',
] as const;
