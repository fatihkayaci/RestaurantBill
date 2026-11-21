import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { publicDeliveryService } from './api/publicDeliveryService';
import {
    addLine, changeQuantity, clearCart, defaultSelections, loadBranchChoice, loadCart, loadOrderSnapshot, moveLineToEnd, newClientRequestId,
    productLineKey, pruneUnavailable, rememberOrder, saveBranchChoice, saveCart, saveOrderSnapshot, selectionNames, setMenuLineKey,
    setMenuUnitPrice, type DeliveryCartLine, type OrderSnapshot,
} from './deliveryCart';
import type { OnlineMenuProduct, OnlineOrdering, OnlineSetMenu, SubmittedDeliveryOrder } from './types';
import { useDeliveryQuote, type DeliveryQuoteState } from './useDeliveryQuote';
import { isOnlineOrderingAvailable } from './useOnlineOrderingAvailable';
import { notifyCartChanged } from './useSiteCart';

// Menü sayfasında sipariş (Sophra): online sipariş verisi (şube, menü, mahalleler, ödeme), cihazda saklanan sepet, teslimat
// şekli, sunucu teklifi ve gönderim sonrası takip. /siparis sayfasının (DeliveryOrderPage) aynı kuralları ve AYNI sepet
// deposu (deliveryCart: şube başına, 24 saat; sitedeki sayaçlar notifyCartChanged ile güncellenir). ?sube=<id> (masa QR'ının
// "Paket servis" bağlantısı) şubeyi seçer, ?tekrar=<takip anahtarı> gönderilmiş sepeti bir kez geri yükler.

export interface OrderSession {
    /** Online sipariş verisi; yüklenene kadar ya da sipariş hiç yoksa null. */
    data: OnlineOrdering | null;
    /** Online sipariş bu restoranda var (saat dışı/durdurulmuş olsa da): sepet ve + düğmeleri görünür. */
    enabled: boolean;
    /** Şu an sipariş gönderilebilir (açık). */
    open: boolean;
    lines: DeliveryCartLine[];
    zoneId: string | null;
    setZoneId: (id: string | null) => void;
    /** Gel al seçili (restoran açmışsa). */
    pickup: boolean;
    setPickup: (pickup: boolean) => void;
    clientRequestId: string;
    quote: DeliveryQuoteState;
    /** Sepete eklenen ürün/menü adları menüden kalktığı ya da tükendiği için düştüyse. */
    droppedNames: string[];
    addProduct: (product: OnlineMenuProduct, quantity?: number, note?: string) => void;
    /** Seçimsiz (varsayılan seçimlerle) ya da verilen seçimlerle hazır menü. */
    addSetMenu: (menu: OnlineSetMenu, selections?: Record<string, string>, quantity?: number, note?: string) => void;
    changeLine: (key: string, delta: number) => void;
    removeLine: (key: string) => void;
    /** Şube değişir: sepet yeni şubenin menüsüne adla taşınır (o şubede olmayanlar düşer). */
    chooseBranch: (branchId: string) => void;
    branchLoading: boolean;
    onSubmitted: (result: SubmittedDeliveryOrder) => void;
}

/** Sepetin satırlarını başka şubenin menüsüne adla taşır (ürün ve menü kimlikleri şube başınadır). */
function remapLines(lines: DeliveryCartLine[], data: OnlineOrdering): { lines: DeliveryCartLine[]; dropped: string[] } {
    const products = data.categories.flatMap(c => c.products);
    const dropped: string[] = [];
    let next: DeliveryCartLine[] = [];
    for (const line of lines) {
        if (line.kind === 'product') {
            const p = products.find(x => x.name === line.name && !x.isOutOfStock);
            if (!p) { dropped.push(line.name); continue; }
            next = addLine(next, { ...line, key: productLineKey(p.id, line.note), productId: p.id, unitPrice: p.price }, line.quantity);
        } else {
            const m = data.setMenus.find(x => x.name === line.name && x.isAvailable);
            if (!m) { dropped.push(line.name); continue; }
            const selections = defaultSelections(m);
            next = addLine(next, {
                ...line, key: setMenuLineKey(m.id, selections, line.note), setMenuId: m.id, selections,
                selectionNames: selectionNames(m, selections), unitPrice: setMenuUnitPrice(m, selections),
            }, line.quantity);
        }
    }
    return { lines: next, dropped };
}

export function useOrderSession(): OrderSession {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [snapshot] = useState<OrderSnapshot | null>(() => {
        const token = params.get('tekrar');
        return token ? loadOrderSnapshot(token) : null;
    });
    const reorder = useRef<OrderSnapshot | null>(snapshot);
    const [branchId, setBranchId] = useState<string | null>(() => params.get('sube') || snapshot?.branchId || loadBranchChoice());
    const [data, setData] = useState<OnlineOrdering | null>(null);
    const [branchLoading, setBranchLoading] = useState(false);
    const [lines, setLines] = useState<DeliveryCartLine[]>([]);
    const [zoneId, setZoneId] = useState<string | null>(null);
    const [pickup, setPickupState] = useState(false);
    const [clientRequestId, setClientRequestId] = useState(() => newClientRequestId());
    const [ready, setReady] = useState(false);
    const [droppedNames, setDroppedNames] = useState<string[]>([]);
    // Şube değişince taşınacak sepet (yeni şubenin verisi gelince adla eşlenir).
    const carry = useRef<DeliveryCartLine[] | null>(null);

    const load = useCallback((requested: string | null) => {
        publicDeliveryService.getOnlineOrdering(requested ?? undefined)
            .then(result => {
                if (requested && result.branches.length > 0 && !result.branches.some(b => b.id === requested)) {
                    setBranchId(null);
                    return;
                }
                setData(result);
                setBranchLoading(false);
                if (requested) saveBranchChoice(result.branchId);
                const stored = loadCart(result.branchId);
                const snap = reorder.current && reorder.current.branchId === result.branchId ? reorder.current : null;
                reorder.current = null;
                let source = stored?.lines ?? [];
                if (snap) for (const line of snap.lines) source = addLine(source, line, line.quantity);
                let dropped: string[] = [];
                if (carry.current) {
                    const moved = remapLines(carry.current, result);
                    for (const line of moved.lines) source = addLine(source, line, line.quantity);
                    dropped = moved.dropped;
                    carry.current = null;
                }
                const pruned = pruneUnavailable(source, result.categories, result.setMenus);
                const kept = new Set(pruned.lines.map(l => l.key));
                setLines(pruned.lines);
                setDroppedNames([...new Set([...dropped, ...source.filter(l => !kept.has(l.key)).map(l => l.name)])]);
                setClientRequestId(stored?.clientRequestId ?? newClientRequestId());
                const preferred = snap?.zoneId ?? stored?.zoneId;
                setZoneId(preferred && result.zones.some(z => z.id === preferred) ? preferred : result.zones.length === 1 ? result.zones[0].id : null);
                const wantsPickup = snap?.pickup ?? stored?.pickup ?? result.zones.length === 0;
                setPickupState(!!result.pickupEnabled && wantsPickup);
                setReady(true);
            })
            .catch(() => { setData(null); setBranchLoading(false); setReady(false); });
    }, []);

    useEffect(() => { load(branchId); }, [branchId, load]);

    // ?tekrar ve ?sube yalnız bir kez işlenir (yenileyince sepet ikinci kez eklenmesin); adres çubuğundan kalkar.
    useEffect(() => {
        if (!ready || (!params.has('tekrar') && !params.has('sube'))) return;
        const next = new URLSearchParams(params);
        next.delete('tekrar');
        next.delete('sube');
        setParams(next, { replace: true });
    }, [ready, params, setParams]);

    // Sepet cihazda saklanır; sitedeki sayaçlar (üst menü) yeniden okur.
    useEffect(() => {
        if (!data || !ready) return;
        saveCart(data.branchId, { lines, zoneId, pickup, clientRequestId });
        notifyCartChanged();
    }, [data, ready, lines, zoneId, pickup, clientRequestId]);

    const enabled = !!data && isOnlineOrderingAvailable(data) && data.state !== 'disabled';
    const isPickup = pickup && !!data?.pickupEnabled;
    const quote = useDeliveryQuote(enabled ? data!.branchId : null, lines, zoneId, isPickup);

    return {
        data,
        enabled,
        open: enabled && data!.state === 'open',
        lines,
        zoneId,
        setZoneId,
        pickup: isPickup,
        setPickup: setPickupState,
        clientRequestId,
        quote,
        droppedNames,
        addProduct: (product, quantity = 1, note = '') => {
            if (!enabled || product.isOutOfStock) return;
            const key = productLineKey(product.id, note);
            setLines(prev => moveLineToEnd(addLine(prev, {
                key, kind: 'product', productId: product.id, name: product.name, unitPrice: product.price,
                note: note.trim(), selections: {}, selectionNames: [],
            }, quantity), key));
        },
        addSetMenu: (menu, selections, quantity = 1, note = '') => {
            if (!enabled || !menu.isAvailable) return;
            const picked = selections ?? defaultSelections(menu);
            const key = setMenuLineKey(menu.id, picked, note);
            setLines(prev => moveLineToEnd(addLine(prev, {
                key, kind: 'setMenu', setMenuId: menu.id, name: menu.name, unitPrice: setMenuUnitPrice(menu, picked),
                note: note.trim(), selections: picked, selectionNames: selectionNames(menu, picked),
            }, quantity), key));
        },
        changeLine: (key, delta) => setLines(prev => changeQuantity(prev, key, delta)),
        removeLine: key => setLines(prev => prev.filter(l => l.key !== key)),
        chooseBranch: id => {
            if (!data || id === data.branchId) return;
            saveBranchChoice(id);
            carry.current = lines;
            // Eski şubenin sepeti boşalır (taşınan satırlar yeni şubede).
            clearCart(data.branchId);
            setReady(false);
            setBranchLoading(true);
            setBranchId(id);
        },
        branchLoading,
        onSubmitted: result => {
            if (!data) return;
            rememberOrder({ token: result.token, number: result.number, createdAt: new Date().toISOString() });
            saveOrderSnapshot(result.token, data.branchId, lines, zoneId, isPickup);
            clearCart(data.branchId);
            setLines([]);
            setClientRequestId(newClientRequestId());
            notifyCartChanged();
            navigate(`/siparis/takip/${encodeURIComponent(result.token)}`);
        },
    };
}
