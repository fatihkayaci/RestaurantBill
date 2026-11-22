import { useEffect, useRef, useState } from 'react';
import { createHubConnection } from '@/lib/signalrConnection';
import { getTenantSlug } from '@/lib/tenant';

/** Art arda gelen sinyaller (ör. onay: talep + hesap + masa durumu) tek yenilemeye düşer. */
const COALESCE_MS = 400;
/** Bağlantı tamamen düşünce yeniden deneme aralıkları (sonuncusu tekrarlanır). */
const RETRY_MS = [5_000, 15_000, 30_000, 60_000];

export interface TableLiveHandlers {
    /** Masanın hesabı, kilidi, bekleyen talepleri ya da masa durumu değişti: hesap yeniden okunur. */
    onBillChanged: () => void;
    /** Masadaki bir talep onaylandı/reddedildi (hangisi olduğu söylenmez): telefon kendi taleplerini yeniden sorar. */
    onRequestsChanged: () => void;
}

/**
 * Müşterinin masa QR sayfasının canlı bağlantısı (/public-table-hub, girişsiz). Masaya katılır (JoinTable), sunucu
 * yalnızca "değişti" sinyali yollar, içerik göndermez; sayfa veriyi mevcut public uçlardan yeniden okur. Yeniden
 * bağlanınca masaya yeniden katılır ve kaçan değişiklikler için bir kez yeniler; sekme görünür olunca da yeniler.
 * Döner: bağlı ve masaya katılmış mı (bağlıyken sayfa yoklamayı seyreltir, değilken normal yoklama sürer).
 */
export function useTableLiveUpdates(tableId: string, enabled: boolean, handlers: TableLiveHandlers): boolean {
    const [connected, setConnected] = useState(false);
    const handlersRef = useRef(handlers);
    useEffect(() => { handlersRef.current = handlers; });

    useEffect(() => {
        if (!enabled || !tableId) return;
        let cancelled = false;
        let flushTimer: number | undefined;
        let retryTimer: number | undefined;
        let retries = 0;
        let pending = { bill: false, requests: false };

        const flush = () => {
            const { bill, requests } = pending;
            pending = { bill: false, requests: false };
            if (requests) handlersRef.current.onRequestsChanged();
            if (bill) handlersRef.current.onBillChanged();
        };
        const schedule = (bill: boolean, requests: boolean) => {
            pending = { bill: pending.bill || bill, requests: pending.requests || requests };
            window.clearTimeout(flushTimer);
            flushTimer = window.setTimeout(flush, COALESCE_MS);
        };

        const slug = getTenantSlug();
        const { connection, stop } = createHubConnection('/public-table-hub', { anonymous: true, query: slug ? { slug } : undefined });
        const sameTable = (id: unknown) => typeof id === 'string' && id.toLowerCase() === tableId.toLowerCase();
        connection.on('TableBillChanged', (id: unknown) => { if (sameTable(id)) schedule(true, false); });
        connection.on('OrderRequestChanged', (id: unknown) => { if (sameTable(id)) schedule(true, true); });

        // Masaya katıl; sunucu masayı tanımazsa (yanlış restoran, kaldırılmış masa) bağlantı kapanır, yoklama sürer.
        const join = async (catchUp: boolean) => {
            const joined = await connection.invoke<boolean>('JoinTable', tableId);
            if (cancelled) return;
            if (!joined) {
                cancelled = true;
                stop();
                setConnected(false);
                return;
            }
            retries = 0;
            setConnected(true);
            if (catchUp) schedule(true, true);
        };

        const retryLater = () => {
            if (cancelled) return;
            window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(() => { void open(true); }, RETRY_MS[Math.min(retries, RETRY_MS.length - 1)]);
            retries++;
        };

        const open = async (catchUp: boolean) => {
            try {
                await connection.start();
                if (cancelled) return;
                await join(catchUp);
            } catch {
                if (!cancelled && connection.state === 'Disconnected') retryLater();
            }
        };

        connection.onreconnecting(() => { if (!cancelled) setConnected(false); });
        connection.onreconnected(() => { if (!cancelled) join(true).catch(() => { /* onclose devralır */ }); });
        // Otomatik yeniden bağlanma pes etti ya da bağlantı hiç kurulamadı: kendi aralığımızla yeniden dene.
        connection.onclose(() => {
            if (cancelled) return;
            setConnected(false);
            retryLater();
        });

        // Telefon uykudan / başka uygulamadan dönünce: kaçan sinyaller için hesabı ve talepleri yeniden sor.
        const onVisible = () => {
            if (document.visibilityState !== 'visible' || cancelled) return;
            schedule(true, true);
            if (connection.state === 'Disconnected') {
                window.clearTimeout(retryTimer);
                void open(true);
            }
        };
        document.addEventListener('visibilitychange', onVisible);

        void open(false);

        return () => {
            cancelled = true;
            window.clearTimeout(flushTimer);
            window.clearTimeout(retryTimer);
            document.removeEventListener('visibilitychange', onVisible);
            stop();
            setConnected(false);
        };
    }, [tableId, enabled]);

    return connected;
}
