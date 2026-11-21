import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { publicService } from '@/features/customerSite/api/publicService';
import type { PublicTableBill, TableOrderLock } from '@/features/customerSite/types';

// Taleplerin yoklamasıyla (useTableOrderRequests) aynı aralık.
const BILL_POLL_MS = 5000;
// Masa başka telefona bağlıyken kilidin kalkıp kalkmadığına daha seyrek bakılır.
const LOCK_POLL_MS = 20000;

// Masa QR'ında bu telefonun durumu ve (masanın telefonuysa) masanın hesabı. Sunucu masayı ilk sipariş talebini gönderen
// telefona bağlar; bu telefon hesabı canlı görür, diğerlerinde sepet kapanır. Hesap kapanınca (403) kilit yeniden sorulur.
export function useTableBill(tableId: string, initialLock: TableOrderLock | undefined) {
    const [lock, setLock] = useState<TableOrderLock>(initialLock ?? 'none');
    const [bill, setBill] = useState<PublicTableBill | null>(null);
    const [tick, setTick] = useState(0);

    // Sayfa (yeniden) yüklenince sunucunun söylediği durum esas alınır.
    const [seenInitial, setSeenInitial] = useState(initialLock);
    if (initialLock !== seenInitial) {
        setSeenInitial(initialLock);
        setLock(initialLock ?? 'none');
    }

    const refreshLock = useCallback(async () => {
        try {
            const info = await publicService.getTable(tableId);
            setLock(info.orderLock ?? 'none');
            if (info.orderLock !== 'mine') setBill(null);
            else setTick(t => t + 1);
        } catch { /* bağlantı geçici koptu: bir sonraki turda */ }
    }, [tableId]);

    useEffect(() => {
        if (lock !== 'mine') return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const load = async () => {
            if (typeof document !== 'undefined' && document.hidden) {
                timer = setTimeout(load, BILL_POLL_MS);
                return;
            }
            try {
                const data = await publicService.getTableBill(tableId);
                if (cancelled) return;
                setBill(data);
            } catch (err) {
                if (cancelled) return;
                // 403: hesap kapandı ya da garson kilidi açtı; telefon artık masaya bağlı değil.
                if (isAxiosError(err) && err.response?.status === 403) {
                    setBill(null);
                    void refreshLock();
                    return;
                }
            }
            if (!cancelled) timer = setTimeout(load, BILL_POLL_MS);
        };
        void load();

        return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, [lock, tableId, tick, refreshLock]);

    useEffect(() => {
        if (lock !== 'other') return;
        const timer = setInterval(() => {
            if (typeof document === 'undefined' || !document.hidden) void refreshLock();
        }, LOCK_POLL_MS);
        return () => clearInterval(timer);
    }, [lock, refreshLock]);

    /** Talep gönderildi: masa artık bu telefona bağlı. */
    const markMine = useCallback(() => {
        setLock('mine');
        setTick(t => t + 1);
    }, []);

    return { lock, bill, markMine, refreshLock };
}
