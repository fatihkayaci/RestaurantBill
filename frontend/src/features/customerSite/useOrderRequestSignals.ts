import { useEffect, useMemo, useRef } from 'react';
import { dismissStaffAlert } from '@/lib/staffAlerts';
import type { OrderRequest } from './types';

/** Masa başına tek toast: aynı masadan ikinci sipariş gelince yenisi eskisinin yerine geçer. */
export function orderRequestToastId(tableId: string): string {
    return `order-request-${tableId}`;
}

/** Masa → onay bekleyen QR sipariş sayısı. Kartın "yanması" ve rozetteki sayı buradan. */
export function countRequestsByTable(requests: OrderRequest[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of requests) map.set(r.tableId, (map.get(r.tableId) ?? 0) + 1);
    return map;
}

// Masalar ekranlarında (garson, yönetici): talebi onaylanan/reddedilen masanın bildirimi kendiliğinden kapanır
// (başka bir cihazdan karar verilse de). Sekme başlığındaki sayı bildirimlerden gelir (lib/staffAlerts).
export function useOrderRequestSignals(requests: OrderRequest[]) {
    const tableKey = useMemo(() => [...new Set(requests.map(r => r.tableId))].sort().join(','), [requests]);
    const previousTables = useRef<Set<string>>(new Set());

    useEffect(() => {
        const current = new Set(tableKey ? tableKey.split(',') : []);
        for (const tableId of previousTables.current) {
            if (!current.has(tableId)) dismissStaffAlert(orderRequestToastId(tableId));
        }
        previousTables.current = current;
    }, [tableKey]);
}
