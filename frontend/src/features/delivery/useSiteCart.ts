import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useTableVisit } from '@/features/customerSite/tableVisit';
import { publicDeliveryService } from './api/publicDeliveryService';
import {
    addLine, changeQuantity, defaultSelections, estimatedSubtotal, itemCount, loadCart, loadRecentOrders, newClientRequestId,
    moveLineToEnd, productKey, pruneUnavailable, removeOneSetMenu, saveBranchChoice, saveCart, selectionNames, setMenuKey, setMenuUnitPrice, type DeliveryCartLine,
} from './deliveryCart';
import { isFinalStatus } from './deliveryStatus';
import type { DeliveryTracking, OnlineMenuProduct, OnlineOrdering, OnlineSetMenu } from './types';
import { isOnlineOrderingAvailable, useOnlineOrdering } from './useOnlineOrderingAvailable';

// Restoran sitesinin (ana sayfa menü panosu, başlıktaki "Sepet") paket sipariş sepeti. Sepet, /siparis sayfasının
// cihazda şube başına sakladığı sepetin AYNISIDIR (deliveryCart.ts → loadCart/saveCart): sitede eklenen ürün sipariş
// sayfasında hazır bekler. Yalnız online sipariş açıksa (useOnlineOrderingAvailable) kullanılır. Fiyatlar tahmindir;
// kesin tutarı sipariş sayfası sunucudan alır.

const listeners = new Set<() => void>();
let version = 0;

/** Sepet başka bir yerden (Sophra menü sayfası) yazıldı: sitedeki sepet sayaçları yeniden okusun. */
export function notifyCartChanged() {
    notify();
}

function notify() {
    version++;
    listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Başka sekmede (/siparis) değişen sepet de yansır.
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith('rb:delivery-cart:')) notify(); };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

export interface SiteCart {
    /** Online sipariş açık ve menü yüklendi: + düğmeleri, sepet paneli ve "Sepet" hapı görünür. */
    enabled: boolean;
    ordering: OnlineOrdering | null;
    lines: DeliveryCartLine[];
    count: number;
    /** Tahmini ara toplam (sunucunun teklifi sipariş sayfasında). */
    subtotal: number;
    /** Sitedeki ürünün paket menüsündeki karşılığı (yoksa sepete eklenemez). */
    productFor: (productId: string) => OnlineMenuProduct | undefined;
    addProduct: (productId: string) => void;
    /** Hazır menü seçimsiz eklenebiliyorsa (bütün bölümler sabit) menü; seçim gerekiyorsa sipariş sayfasında seçilir. */
    setMenuFor: (setMenuId: string) => { menu: OnlineSetMenu; needsChoice: boolean } | undefined;
    addSetMenu: (setMenuId: string) => void;
    /** Seçim penceresinden (DeliverySetMenuSheet): seçimli, adetli, notlu menü; /siparis sayfasıyla aynı satır anahtarı. */
    addSetMenuWith: (setMenuId: string, selections: Record<string, string>, quantity: number, note: string) => void;
    /** Ürünün sepet satırını bir azaltır (0'da satır silinir). */
    removeProduct: (productId: string) => void;
    /** Menünün son eklenen satırını bir azaltır. */
    removeSetMenu: (setMenuId: string) => void;
    changeLine: (key: string, delta: number) => void;
}

export function useSiteCart(): SiteCart {
    const ordering = useOnlineOrdering();
    // Bu sekmede masa QR'ı okutulduysa müşteri masada: paket sepeti (teslimat ücreti, mahalle) hiç görünmez.
    const atTable = useTableVisit() !== null;
    const enabled = !atTable && isOnlineOrderingAvailable(ordering) && ordering?.state !== 'disabled';
    const branchId = enabled ? ordering!.branchId : null;
    const tick = useSyncExternalStore(subscribe, () => version);

    const stored = useMemo(() => {
        void tick;
        return branchId ? loadCart(branchId) : null;
    }, [branchId, tick]);

    const products = useMemo(() => new Map((ordering?.categories ?? []).flatMap(c => c.products).map(p => [p.id, p])), [ordering]);
    const menus = useMemo(() => new Map((ordering?.setMenus ?? []).map(m => [m.id, m])), [ordering]);

    // Tükenen ya da menüden kalkan satırlar gösterilmez (sipariş sayfası açılınca da düşer).
    const lines = useMemo(() => {
        if (!ordering || !stored) return [];
        return pruneUnavailable(stored.lines, ordering.categories, ordering.setMenus).lines;
    }, [ordering, stored]);

    const write = (next: DeliveryCartLine[]) => {
        if (!branchId || !ordering) return;
        const current = loadCart(branchId);
        saveCart(branchId, {
            lines: next,
            zoneId: current?.zoneId ?? null,
            pickup: current?.pickup,
            clientRequestId: current?.clientRequestId ?? newClientRequestId(),
        });
        // Çok şubeli restoranda sipariş sayfası aynı şubeyle açılsın (şube seçimi sorulmadan sepet görünsün).
        if (ordering.branches.length > 1) saveBranchChoice(branchId);
        notify();
    };
    const currentLines = () => (branchId ? loadCart(branchId)?.lines ?? [] : []);

    return {
        enabled,
        ordering,
        lines,
        count: itemCount(lines),
        subtotal: estimatedSubtotal(lines),
        productFor: id => products.get(id),
        addProduct: id => {
            const product = products.get(id);
            if (!product || product.isOutOfStock) return;
            write(moveLineToEnd(addLine(currentLines(), {
                key: productKey(product.id), kind: 'product', productId: product.id, name: product.name, unitPrice: product.price,
                note: '', selections: {}, selectionNames: [],
            }), productKey(product.id)));
        },
        setMenuFor: id => {
            const menu = menus.get(id);
            if (!menu) return undefined;
            return { menu, needsChoice: menu.slots.some(s => !s.isFixed && s.options.filter(o => o.isAvailable).length > 1) };
        },
        addSetMenu: id => {
            const menu = menus.get(id);
            if (!menu || !menu.isAvailable) return;
            const selections = defaultSelections(menu);
            write(moveLineToEnd(addLine(currentLines(), {
                key: setMenuKey(menu.id, selections), kind: 'setMenu', setMenuId: menu.id, name: menu.name,
                unitPrice: setMenuUnitPrice(menu, selections), note: '', selections, selectionNames: selectionNames(menu, selections),
            }), setMenuKey(menu.id, selections)));
        },
        addSetMenuWith: (id, selections, quantity, note) => {
            const menu = menus.get(id);
            if (!menu || !menu.isAvailable) return;
            const key = setMenuKey(menu.id, selections) + (note ? `:${note}` : '');
            write(moveLineToEnd(addLine(currentLines(), {
                key, kind: 'setMenu', setMenuId: menu.id, name: menu.name,
                unitPrice: setMenuUnitPrice(menu, selections), note, selections, selectionNames: selectionNames(menu, selections),
            }, quantity), key));
        },
        removeProduct: id => write(changeQuantity(currentLines(), productKey(id), -1)),
        removeSetMenu: id => write(removeOneSetMenu(currentLines(), id)),
        changeLine: (key, delta) => write(changeQuantity(currentLines(), key, delta)),
    };
}

// ── Bu cihazın son paket siparişi ────────────────────────────────────────────────────────────

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface ActiveDeliveryOrder {
    token: string;
    number: number;
    tracking: DeliveryTracking;
}

/** Bu cihazdan son 24 saatte verilmiş ve henüz bitmemiş (teslim, ret, iptal değil) paket sipariş; yoksa null. */
export function useActiveDeliveryOrder(enabled: boolean): ActiveDeliveryOrder | null {
    const [active, setActive] = useState<ActiveDeliveryOrder | null>(null);
    useEffect(() => {
        if (!enabled) return;
        const recent = loadRecentOrders()[0];
        if (!recent || Date.now() - new Date(recent.createdAt).getTime() > ACTIVE_WINDOW_MS) return;
        let cancelled = false;
        publicDeliveryService.getTracking(recent.token)
            .then(tracking => {
                if (!cancelled && !isFinalStatus(tracking.status)) setActive({ token: recent.token, number: recent.number, tracking });
            })
            .catch(() => { /* bağlantı yoksa şerit çizilmez */ });
        return () => { cancelled = true; };
    }, [enabled]);
    return active;
}

/** Başlıktaki "Siparişim" bağlantısı: bu cihazdan verilen son siparişin takip sayfası (yoksa null). */
export function lastOrderTrackingPath(): string | null {
    const recent = loadRecentOrders()[0];
    return recent ? `/siparis/takip/${encodeURIComponent(recent.token)}` : null;
}
