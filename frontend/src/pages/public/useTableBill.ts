import { useCallback, useEffect, useState } from 'react';
import { publicService } from '@/features/customerSite/api/publicService';
import type { PublicTableBill } from '@/features/customerSite/types';

// Masada açık hesap varken ya da bu telefonun onay bekleyen talebi varken hesap sık yoklanır.
const BILL_POLL_MS = 10000;
// Hesap yokken (yeni hesap açılabilir, personel QR kilidini değiştirebilir) ve ödenen hesap görünürken daha seyrek.
const IDLE_POLL_MS = 30000;

// Masanın ortak hesabı ve personelin QR kilidi. Açık hesap masadaki her telefonda görünür. Hesap ödenince sunucu
// "Ödendi" fişini yalnız o hesaba sipariş veren telefonlara bir süre döndürür; diğer telefonlar "açık hesap yok" görür.
// Yoklama aynı zamanda QR kilidini (qrOrderingLocked) getirir: personel kilitleyince sepet bir sonraki turda kapanır.
export function useTableBill(tableId: string, initialLocked: boolean | undefined, hasPending: boolean) {
    const [bill, setBill] = useState<PublicTableBill | null>(null);
    const [locked, setLocked] = useState(initialLocked === true);
    const [tick, setTick] = useState(0);

    // Sayfa (yeniden) yüklenince sunucunun söylediği kilit esas alınır.
    const [seenInitial, setSeenInitial] = useState(initialLocked);
    if (initialLocked !== seenInitial) {
        setSeenInitial(initialLocked);
        setLocked(initialLocked === true);
    }

    const openBill = bill?.hasBill === true && !bill.isPaid;
    const fast = openBill || hasPending;

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const interval = fast ? BILL_POLL_MS : IDLE_POLL_MS;

        const load = async () => {
            if (typeof document === 'undefined' || !document.hidden) {
                try {
                    const data = await publicService.getTableBill(tableId);
                    if (cancelled) return;
                    setBill(data);
                    if (typeof data.qrOrderingLocked === 'boolean') setLocked(data.qrOrderingLocked);
                } catch { /* bağlantı geçici koptu: bir sonraki turda */ }
            }
            if (!cancelled) timer = setTimeout(load, interval);
        };
        void load();

        return () => { cancelled = true; if (timer) clearTimeout(timer); };
    }, [tableId, tick, fast]);

    /** Hemen yeniden sor (talep gönderildi ya da sunucu kilit nedeniyle reddetti). */
    const refresh = useCallback(() => setTick(t => t + 1), []);

    return { bill, locked, refresh };
}
