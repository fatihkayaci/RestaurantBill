import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { publicService } from '@/features/customerSite/api/publicService';
import {
    isFinalOrderRequestStage, ORDER_REQUEST_APPROVED, ORDER_REQUEST_PENDING, ORDER_REQUEST_REJECTED, type OrderRequestStage,
} from '@/features/customerSite/types';

/** Müşterinin bu masadan gönderdiği bir sipariş talebi; kalemler gönderim anında sepetten kopyalanır. */
export interface SentOrderRequest {
    id: string;
    status: number;
    sentAt: number;
    total: number;
    /** takeaway: müşteri "Paket olsun" dedi. */
    items: { name: string; quantity: number; productId?: string; setMenuId?: string; takeaway?: boolean }[];
    /** Garson reddettiyse yazdığı neden (boş olabilir). */
    rejectReason?: string;
    /** Son görülen müşteri aşaması (onaydan sonra mutfak durumundan); eski kayıt ya da eski sunucu: yok. */
    stage?: OrderRequestStage;
}

export interface OrderRequestEvents {
    /** Talep onaylandı; verilmezse genel bildirim (sonner) gösterilir. */
    onApproved?: (request: SentOrderRequest) => void;
    /** Onaylanan talebin aşaması değişti (ör. OnTheWay: "Masanıza geliyor"); yalnız refresh() ile izlenir. */
    onStage?: (request: SentOrderRequest, stage: OrderRequestStage) => void;
}

const POLL_MS = 5000;
// Canlı bağlantı varken karar anında bildirilir; bekleyenlerin yoklaması yalnız yedek.
const LIVE_POLL_MS = 30000;
// Onaylanan talebin aşaması (Hazırlanıyor → Masanıza geliyor) bu süre boyunca refresh() ile izlenir.
const STAGE_TRACK_MS = 3 * 60 * 60 * 1000;
// Masa oturumu sunucuda tutulmuyor: aynı telefonda yarım günden eski talepler başka bir ziyarete aittir.
const SESSION_MS = 12 * 60 * 60 * 1000;

const storageKey = (tableId: string) => `rb:order-requests:${tableId}`;

function readSaved(tableId: string): SentOrderRequest[] {
    try {
        const raw = localStorage.getItem(storageKey(tableId));
        const list: SentOrderRequest[] = raw ? JSON.parse(raw) : [];
        return list.filter(r => Date.now() - r.sentAt < SESSION_MS);
    } catch {
        return [];
    }
}

function save(tableId: string, list: SentOrderRequest[]) {
    try { localStorage.setItem(storageKey(tableId), JSON.stringify(list)); } catch { /* özel pencere: liste yalnızca bu sekmede kalır */ }
}

// Masadan gönderilen talepleri saklar ve bekleyenlerin durumunu sorgular (garson onayı/reddi). refresh(): bekleyenleri ve
// onaylanıp henüz servis edilmemiş talepleri hemen sorar (canlı bağlantı "talep değişti" deyince ya da sekmeye dönünce).
export function useTableOrderRequests(tableId: string, events: OrderRequestEvents = {}, live = false) {
    const [requests, setRequests] = useState<SentOrderRequest[]>(() => readSaved(tableId));
    const requestsRef = useRef(requests);
    const eventsRef = useRef(events);
    useEffect(() => { requestsRef.current = requests; eventsRef.current = events; });
    // Yoklama ve refresh() aynı anda sorabilir: her karar ve aşama geçişi bir kez bildirilir.
    const announced = useRef(new Set<string>());

    useEffect(() => { save(tableId, requests); }, [tableId, requests]);

    const pendingIds = requests.filter(r => r.status === ORDER_REQUEST_PENDING).map(r => r.id).join(',');

    // Verilen taleplerin durumunu sorar; değişenleri kaydeder ve bildirir. true: en az biri değişti.
    const check = useCallback(async (ids: string[]): Promise<boolean> => {
        if (ids.length === 0) return false;
        const announceOnce = (key: string) => {
            if (announced.current.has(key)) return false;
            announced.current.add(key);
            return true;
        };
        const results = await Promise.allSettled(ids.map(id => publicService.getOrderRequestStatus(id)));
        const known = new Map(requestsRef.current.map(r => [r.id, r]));
        const updates = new Map<string, Pick<SentOrderRequest, 'status' | 'rejectReason' | 'stage'>>();

        for (const result of results) {
            if (result.status !== 'fulfilled') continue;
            const { id, status, rejectReason, stage } = result.value;
            const prev = known.get(id);
            if (!prev || updates.has(id)) continue;
            const decided = prev.status === ORDER_REQUEST_PENDING && status !== ORDER_REQUEST_PENDING;
            const stageChanged = stage !== undefined && stage !== prev.stage;
            if (!decided && !stageChanged) continue;

            if (decided && status === ORDER_REQUEST_APPROVED) {
                if (!announceOnce(`${id}:${status}`)) continue;
                if (eventsRef.current.onApproved) eventsRef.current.onApproved(prev);
                else toast.success('Siparişiniz onaylandı, mutfağa iletildi.');
            } else if (decided && status === ORDER_REQUEST_REJECTED) {
                if (!announceOnce(`${id}:${status}`)) continue;
                toast.error('Siparişiniz onaylanmadı.', { description: rejectReason || 'Ayrıntı için garsona danışın.' });
            } else if (!decided && prev.status === ORDER_REQUEST_APPROVED && prev.stage !== undefined && stage && announceOnce(`${id}:${stage}`)) {
                // İlk kez görülen aşama (eski kayıt) sessizce yazılır; yalnız onaydan sonraki gerçek geçiş bildirilir.
                eventsRef.current.onStage?.(prev, stage);
            }
            updates.set(id, { status, rejectReason: decided ? rejectReason ?? '' : prev.rejectReason, stage: stage ?? prev.stage });
        }

        if (updates.size === 0) return false;
        setRequests(prev => prev.map(r => {
            const update = updates.get(r.id);
            return update ? { ...r, ...update } : r;
        }));
        return true;
    }, []);

    useEffect(() => {
        if (!pendingIds) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const interval = live ? LIVE_POLL_MS : POLL_MS;

        const poll = async () => {
            await check(pendingIds.split(','));
            // Bir tur sonra tekrar sor. Karar geldiyse bekleyen listesi değişir ve bu effect yeniden kurulur (bu tur iptal).
            if (!cancelled) timer = setTimeout(poll, interval);
        };
        timer = setTimeout(poll, interval);

        return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, [pendingIds, live, check]);

    /** Bekleyenleri ve aşaması izlenen onaylı talepleri hemen sor. */
    const refresh = useCallback(() => {
        const now = Date.now();
        const ids = requestsRef.current
            .filter(r => r.status === ORDER_REQUEST_PENDING
                || (r.status === ORDER_REQUEST_APPROVED && now - r.sentAt < STAGE_TRACK_MS && !isFinalOrderRequestStage(r.stage)))
            .map(r => r.id);
        void check(ids);
    }, [check]);

    const addRequest = useCallback((request: Omit<SentOrderRequest, 'sentAt'>) => {
        setRequests(prev => [{ ...request, sentAt: Date.now() }, ...prev]);
    }, []);

    return { requests, addRequest, refresh };
}
