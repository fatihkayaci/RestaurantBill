import { useSyncExternalStore } from 'react';

// Personel ekranının ortasında açılan, arka planı kaplayan ve "Tamam"a basılmadan kapanmayan uyarıların kuyruğu
// (QR sipariş, garson çağrısı). Olayı alan bileşen pushBlockingAlert ile ekler; pencereyi OrderRequestAlerts çizer.
// Aynı masa ve aynı türden yeni uyarı eskisinin yerine geçer.

export type BlockingAlertKind = 'order' | 'call';

export interface BlockingAlert {
    kind: BlockingAlertKind;
    tableId: string;
    tableName: string;
    /** Ör. "3 ürün · Salon · onayınızı bekliyor". */
    detail: string;
}

let alerts: BlockingAlert[] = [];
const listeners = new Set<() => void>();

function emit() {
    for (const l of listeners) l();
}

export function pushBlockingAlert(alert: BlockingAlert) {
    alerts = [...alerts.filter(a => !(a.tableId === alert.tableId && a.kind === alert.kind)), alert];
    emit();
}

export function clearBlockingAlerts() {
    if (alerts.length === 0) return;
    alerts = [];
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function useBlockingAlerts(): BlockingAlert[] {
    return useSyncExternalStore(subscribe, () => alerts, () => alerts);
}
