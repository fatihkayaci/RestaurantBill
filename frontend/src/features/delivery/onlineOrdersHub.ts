// Online siparişlerin canlı olayları için tek /cashier-hub bağlantısı. Uyarılar (OnlineOrderAlerts), pano
// (OnlineOrdersBoard) ve kurye kasası (CourierCashPanel) aynı bağlantıyı paylaşır: ilk abone bağlantıyı açar, son abone
// ayrılınca kapanır (StrictMode'un çift bağlanmasında kapanış bir tur ertelenir).
// Dinleyici "bir şey değişti, yeniden çek" anlamındadır: olay (DeliveryOrdersChanged) ya da null (paket siparişin
// ürünleri hazır / bağlantı yeniden kuruldu: arada kaçan olay olabilir).
import { useSyncExternalStore } from 'react';
import { createHubConnection, type ManagedHubConnection } from '@/lib/signalrConnection';
import type { ItemsReadyEvent } from '@/features/orders/types';
import type { DeliveryOrdersChangedEvent } from './types';

type Listener = (event: DeliveryOrdersChangedEvent | null) => void;

const listeners = new Set<Listener>();
let managed: ManagedHubConnection | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

function emit(event: DeliveryOrdersChangedEvent | null) {
    listeners.forEach(listener => {
        try { listener(event); } catch (err) { console.error(err); }
    });
}

function open() {
    const hub = createHubConnection('/cashier-hub');
    hub.connection.on('DeliveryOrdersChanged', (event: DeliveryOrdersChangedEvent) => emit(event ?? null));
    hub.connection.on('ItemsReady', (event: ItemsReadyEvent) => { if (event?.deliveryNumber != null) emit(null); });
    hub.connection.onreconnected(() => emit(null));
    hub.connection.start().catch(err => { if (managed === hub) console.error('OnlineOrders SignalR:', err); });
    managed = hub;
}

export function subscribeOnlineOrders(listener: Listener): () => void {
    listeners.add(listener);
    if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
    }
    if (!managed) open();
    return () => {
        listeners.delete(listener);
        if (listeners.size > 0 || stopTimer) return;
        stopTimer = setTimeout(() => {
            stopTimer = null;
            if (listeners.size === 0 && managed) {
                const hub = managed;
                managed = null;
                hub.stop();
            }
        }, 0);
    };
}

// ── Görülen yeni siparişler ve "yeni sipariş" sayısı (başlık rozeti) ─────────────────────────
// Bir yeni siparişin kartı açılınca (ya da uyarısındaki "Aç"a basılınca) o sipariş bu cihazda "görüldü" sayılır: kalıcı
// uyarı kalkar, tekrar eden ses o sipariş için susar. Sipariş kabul/ret edilince zaten "Yeni" olmaktan çıkar.

const seen = new Set<string>();
const storeListeners = new Set<() => void>();
let newOrderIds: string[] = [];
let snapshot = { newCount: 0, unseenCount: 0 };

function recompute() {
    const unseen = newOrderIds.filter(id => !seen.has(id)).length;
    if (snapshot.newCount === newOrderIds.length && snapshot.unseenCount === unseen) return;
    snapshot = { newCount: newOrderIds.length, unseenCount: unseen };
    storeListeners.forEach(l => l());
}

/** Uyarılar, açık siparişleri her çekişte yeni (onay bekleyen) siparişlerin listesini buraya yazar. */
export function setNewOnlineOrderIds(ids: string[]) {
    newOrderIds = ids;
    for (const id of [...seen]) if (!ids.includes(id)) seen.delete(id);
    recompute();
}

export function markOnlineOrderSeen(id: string) {
    if (seen.has(id)) return;
    seen.add(id);
    recompute();
}

export function isOnlineOrderSeen(id: string): boolean {
    return seen.has(id);
}

export function subscribeNewOnlineOrders(listener: () => void): () => void {
    storeListeners.add(listener);
    return () => { storeListeners.delete(listener); };
}

export function useNewOnlineOrderCounts(): { newCount: number; unseenCount: number } {
    return useSyncExternalStore(subscribeNewOnlineOrders, () => snapshot);
}
