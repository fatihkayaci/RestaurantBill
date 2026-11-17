import { useCallback, useEffect, useState } from 'react';
import type { TableActionResult } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';

export type TableActionState =
    | { status: 'idle' }
    | { status: 'sending' }
    /** sent=false: aynı istek bu masadan az önce yapılmış, sunucu yeniden bildirmedi. */
    | { status: 'done'; sent: boolean; until: number; at: number; window: number; billTotal: number | null }
    | { status: 'error'; message: string };

// Karşılama ekranının "Garson çağır" / "Hesap iste" düğmesi: gönderir, sunucunun bildirdiği bekleme süresini sayar.
// Bekleme sunucuda da uygulanır (masa başına 60 sn); burada yalnızca düğmeyi kapatıp kalan süreyi göstermek için.
export function useTableAction(run: () => Promise<TableActionResult>, fallbackError: string) {
    const [state, setState] = useState<TableActionState>({ status: 'idle' });
    const [now, setNow] = useState(() => Date.now());

    const until = state.status === 'done' ? state.until : 0;
    useEffect(() => {
        if (!until) return;
        const timer = setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= until) setState({ status: 'idle' });
        }, 1000);
        return () => clearInterval(timer);
    }, [until]);

    const trigger = useCallback(async () => {
        setState({ status: 'sending' });
        try {
            const result = await run();
            const start = Date.now();
            setNow(start);
            setState({
                status: 'done', sent: result.sent, until: start + result.retryAfterSeconds * 1000, at: start,
                window: result.retryAfterSeconds, billTotal: result.billTotal ?? null,
            });
            return true;
        } catch (err) {
            setState({ status: 'error', message: getApiErrorMessage(err, fallbackError) });
            return false;
        }
    }, [run, fallbackError]);

    const remainingSeconds = until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
    return { state, remainingSeconds, trigger };
}

/** 75 → "1:15" (geri sayım). */
export function formatClock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** 60 → "1 dk", 40 → "40 sn". */
export function formatWait(seconds: number): string {
    return seconds >= 60 ? `${Math.ceil(seconds / 60)} dk` : `${seconds} sn`;
}
