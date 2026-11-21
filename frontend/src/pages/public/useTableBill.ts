import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { publicService } from '@/features/customerSite/api/publicService';
import type { PublicTableBill, TableOrderLock } from '@/features/customerSite/types';

// Taleplerin yoklamasıyla (useTableOrderRequests) aynı aralık.
const BILL_POLL_MS = 5000;
// Masa başka telefona bağlıyken kilidin kalkıp kalkmadığına, ödenen hesabın da süresinin dolup dolmadığına daha seyrek
// bakılır.
const LOCK_POLL_MS = 20000;

// Masa QR'ında bu telefonun durumu ve masanın hesabı. Sunucu masayı ilk sipariş talebini gönderen telefona bağlar; bu
// telefon hesabı canlı görür, diğerlerinde sepet kapanır. Hesap ödenince kilit düşer ama sunucu aynı telefona kapanan
// hesabı bir süre "Ödendi" (isPaid) olarak döndürür: sayfa yenilense, masa başka telefona geçse de görünür. Aynı telefon
// yeniden sipariş verirse yeni açık hesap onun yerine geçer. 403: bu telefonun gösterilecek hesabı yok.
export function useTableBill(tableId: string, initialLock: TableOrderLock | undefined) {
    const [lock, setLock] = useState<TableOrderLock>(initialLock ?? 'none');
    const [bill, setBill] = useState<PublicTableBill | null>(null);
    const [tick, setTick] = useState(0);
    // Hesabın ödendiğini ilk gördüğümüzde kilit bir kez yeniden sorulur (her yoklamada değil).
    const wasPaid = useRef(false);

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
        } catch { /* bağlantı geçici koptu: bir sonraki turda */ }
    }, [tableId]);

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const mine = lock === 'mine';

        const load = async () => {
            if (typeof document !== 'undefined' && document.hidden) {
                timer = setTimeout(load, mine ? BILL_POLL_MS : LOCK_POLL_MS);
                return;
            }
            let next: number | null = mine ? BILL_POLL_MS : LOCK_POLL_MS;
            try {
                const data = await publicService.getTableBill(tableId);
                if (cancelled) return;
                setBill(data);
                // Hesap az önce ödendi: masa artık bu telefona bağlı olmayabilir (kilit sorulur, yoklama seyrekleşir).
                if (data.isPaid && !wasPaid.current && mine) void refreshLock();
                wasPaid.current = data.isPaid;
                // Masa bu telefona bağlı değil ve gösterilecek ödenen hesap da yok: sormaya gerek yok.
                if (!mine && !data.hasBill) next = null;
            } catch (err) {
                if (cancelled) return;
                // 403: hesap yok (ödenen hesabın süresi doldu, iptal edildi ya da garson kilidi açtı).
                if (isAxiosError(err) && err.response?.status === 403) {
                    setBill(null);
                    wasPaid.current = false;
                    if (mine) void refreshLock();
                    next = null;
                }
            }
            if (!cancelled && next != null) timer = setTimeout(load, next);
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
