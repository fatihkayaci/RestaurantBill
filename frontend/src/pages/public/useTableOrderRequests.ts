import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { publicService } from '@/features/customerSite/api/publicService';
import { ORDER_REQUEST_APPROVED, ORDER_REQUEST_PENDING, ORDER_REQUEST_REJECTED } from '@/features/customerSite/types';

/** Müşterinin bu masadan gönderdiği bir sipariş talebi; kalemler gönderim anında sepetten kopyalanır. */
export interface SentOrderRequest {
    id: string;
    status: number;
    sentAt: number;
    total: number;
    items: { name: string; quantity: number }[];
}

const POLL_MS = 5000;
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

// Masadan gönderilen talepleri saklar ve bekleyenlerin durumunu sorgular (garson onayı/reddi).
export function useTableOrderRequests(tableId: string) {
    const [requests, setRequests] = useState<SentOrderRequest[]>(() => readSaved(tableId));

    useEffect(() => { save(tableId, requests); }, [tableId, requests]);

    const pendingIds = requests.filter(r => r.status === ORDER_REQUEST_PENDING).map(r => r.id).join(',');

    useEffect(() => {
        if (!pendingIds) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const check = async () => {
            const results = await Promise.allSettled(pendingIds.split(',').map(id => publicService.getOrderRequestStatus(id)));
            if (cancelled) return;

            const decided = new Map<string, number>();
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value.status !== ORDER_REQUEST_PENDING) {
                    decided.set(result.value.id, result.value.status);
                }
            }

            if (decided.size === 0) {
                // Karar yok ya da bağlantı geçici koptu: bir tur sonra tekrar sor.
                timer = setTimeout(check, POLL_MS);
                return;
            }

            for (const status of decided.values()) {
                if (status === ORDER_REQUEST_APPROVED) toast.success('Siparişiniz onaylandı, mutfağa iletildi.');
                if (status === ORDER_REQUEST_REJECTED) toast.error('Siparişiniz onaylanmadı. Lütfen garsona danışın.');
            }
            // Bekleyen listesi değişince bu effect yeniden kurulur; kalan bekleyenler varsa sorgu sürer.
            setRequests(prev => prev.map(r => decided.has(r.id) ? { ...r, status: decided.get(r.id)! } : r));
        };
        timer = setTimeout(check, POLL_MS);

        return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, [pendingIds]);

    const addRequest = useCallback((request: Omit<SentOrderRequest, 'sentAt'>) => {
        setRequests(prev => [{ ...request, sentAt: Date.now() }, ...prev]);
    }, []);

    return { requests, addRequest };
}
