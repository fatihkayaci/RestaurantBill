import type { DashboardStats, OverdueOrderItem } from '../../types';

// Genel Bakış masa alanının veri katmanı: /stats/dashboard yanıtı tek bir "canlı masa" modeline çevrilir.
// Masa başına ödeme, hesap isteği, kalem durumları ve QR isteği bu yanıtta kimlikle gelir; ayrıca istek atılmaz.

/** Bir masa bu süreden uzun açıksa "uzun açık" sayılır. */
export const LONG_OPEN_MINUTES = 60;

export type TableKind = 'empty' | 'busy' | 'reserved' | 'off';

export interface LiveOverdueItem {
    id: string;
    productName: string;
    quantity: number;
    prepMinutes: number;
    lateMinutes: number;
}

export interface ItemCounts {
    /** Mutfak henüz başlamadı + hazırlanıyor, adet bazında. */
    kitchen: number;
    /** Hazır, servis bekliyor. */
    ready: number;
    /** Servis edildi. */
    served: number;
    total: number;
}

export interface LiveTable {
    id: string;
    name: string;
    kind: TableKind;
    occupiedSince: string | null;
    longOpen: boolean;
    total: number;
    paid: number;
    remaining: number;
    billRequestedAt: string | null;
    qrRequest: boolean;
    nextReservationTime: string | null;
    nextReservationGuest: string | null;
    counts: ItemCounts;
    /** En çok geciken önce. */
    overdue: LiveOverdueItem[];
}

export interface LiveSummary {
    occupied: number;
    totalTables: number;
    occupancyPct: number;
    openOrders: number;
    kitchenPending: number;
    readyWaiting: number;
    billRequests: number;
    qrRequests: number;
    overdueItems: number;
    overdueTables: number;
    /** Masaya bağlı olmayan (paket ya da haritada bulunamayan) geciken kalemler; bilgi kaybolmasın diye özette gösterilir. */
    overdueUnplaced: LiveOverdueItem[];
    openTotal: number;
    longestOpenTableName: string | null;
    longestOpenSince: string | null;
}

export interface LiveRegion {
    id: string;
    name: string;
    tables: LiveTable[];
}

const minutesBetween = (from: string, now: number) => Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000));

function toOverdue(item: OverdueOrderItem, now: number): LiveOverdueItem {
    return {
        id: item.orderItemId,
        productName: item.productName,
        quantity: item.quantity,
        prepMinutes: item.prepMinutes,
        lateMinutes: minutesBetween(item.dueAt, now),
    };
}

export function buildLiveTables(stats: DashboardStats, now: number): { regions: LiveRegion[]; summary: LiveSummary } {
    const overdueByTable = new Map<string, OverdueOrderItem[]>();
    for (const item of stats.overdue) {
        if (!item.tableId) continue;
        const list = overdueByTable.get(item.tableId) ?? [];
        list.push(item);
        overdueByTable.set(item.tableId, list);
    }
    const qrTableIds = new Set(stats.pending.orderRequestTableIds);

    const placed = new Set<string>();
    const regions: LiveRegion[] = stats.regions
        .filter(r => r.tables.length > 0)
        .map(region => ({
            id: region.id,
            name: region.name,
            tables: region.tables.map((t): LiveTable => {
                placed.add(t.id);
                const kind: TableKind = t.status === 2 ? 'busy' : t.status === 3 ? 'reserved' : t.status === 4 ? 'off' : 'empty';
                const minutesOpen = kind === 'busy' && t.occupiedSince ? minutesBetween(t.occupiedSince, now) : 0;
                return {
                    id: t.id,
                    name: t.name,
                    kind,
                    occupiedSince: t.occupiedSince,
                    longOpen: kind === 'busy' && minutesOpen >= LONG_OPEN_MINUTES,
                    total: t.activeOrderTotal,
                    paid: t.paidAmount,
                    remaining: t.remainingAmount,
                    billRequestedAt: kind === 'busy' ? t.billRequestedAt : null,
                    qrRequest: qrTableIds.has(t.id),
                    nextReservationTime: t.nextReservationTime,
                    nextReservationGuest: t.nextReservationGuest,
                    counts: {
                        kitchen: t.kitchenItems,
                        ready: t.readyItems,
                        served: t.servedItems,
                        total: t.kitchenItems + t.readyItems + t.servedItems,
                    },
                    overdue: (overdueByTable.get(t.id) ?? []).map(i => toOverdue(i, now)).sort((a, b) => b.lateMinutes - a.lateMinutes),
                };
            }),
        }));

    const all = regions.flatMap(r => r.tables);
    const overdueUnplaced = stats.overdue
        .filter(i => !i.tableId || !placed.has(i.tableId))
        .map(i => toOverdue(i, now));

    const l = stats.live;
    const summary: LiveSummary = {
        occupied: l.occupiedTables,
        totalTables: l.totalTables,
        occupancyPct: l.totalTables > 0 ? Math.round((l.occupiedTables / l.totalTables) * 100) : 0,
        openOrders: l.openOrders,
        kitchenPending: l.kitchenPending,
        readyWaiting: all.reduce((s, t) => s + t.counts.ready, 0),
        billRequests: all.filter(t => t.billRequestedAt).length,
        qrRequests: stats.pending.orderRequests,
        overdueItems: stats.overdue.length,
        overdueTables: all.filter(t => t.overdue.length > 0).length,
        overdueUnplaced,
        openTotal: all.reduce((s, t) => s + (t.kind === 'busy' ? t.total : 0), 0),
        longestOpenTableName: l.longestOpenTableName,
        longestOpenSince: l.longestOpenSince,
    };

    return { regions, summary };
}
