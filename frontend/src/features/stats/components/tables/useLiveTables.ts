import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardStats } from '../../types';
import { createHubConnection } from '@/lib/signalrConnection';
import { buildLiveTables } from './liveTables';

/** Geçen süreler dakikada bir güncellenir; yalnızca masa alanı yeniden çizilir. */
function useMinuteNow(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);
    return now;
}

/**
 * Masa alanının canlı verisi. Hepsi panel verisinden (/stats/dashboard) gelir; panel 30 sn'de bir, sekmeye
 * dönüşte, kayıt değişikliğinde ve gecikme uyarısında yenilenir. /table-hub ve /cashier-hub olayları gelince
 * de panel yenilenir (kısa gecikmeyle, art arda olaylar tek isteğe düşer).
 */
export function useLiveTables(stats: DashboardStats, onRefresh: () => void) {
    const now = useMinuteNow();

    const refreshRef = useRef(onRefresh);
    useEffect(() => { refreshRef.current = onRefresh; }, [onRefresh]);

    useEffect(() => {
        let timer: number | undefined;
        const schedule = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => refreshRef.current(), 600);
        };
        const tableHub = createHubConnection('/table-hub');
        for (const event of ['TableStatusChanged', 'OrderUpdated', 'OrderClosed', 'BillRequestChanged', 'CustomerRequestsChanged']) {
            tableHub.connection.on(event, schedule);
        }
        const cashierHub = createHubConnection('/cashier-hub');
        cashierHub.connection.on('OrdersChanged', schedule);

        let cancelled = false;
        tableHub.connection.start().catch(err => { if (!cancelled) console.error('Genel Bakış table-hub:', err); });
        cashierHub.connection.start().catch(err => { if (!cancelled) console.error('Genel Bakış cashier-hub:', err); });
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            tableHub.stop();
            cashierHub.stop();
        };
    }, []);

    // Tarayıcı saati panel üretim anından gerideyse süreler eksiye düşmesin.
    const effectiveNow = Math.max(now, new Date(stats.generatedAt).getTime());
    const live = useMemo(() => buildLiveTables(stats, effectiveNow), [stats, effectiveNow]);
    return { ...live, now: effectiveNow };
}
