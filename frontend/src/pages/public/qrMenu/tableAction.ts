import { useCallback, useEffect, useRef, useState } from 'react';
import type { TableActionState } from '../useTableAction';

/** "Garson çağır" / "Hesap iste" düğmesinin durumu (useTableAction). */
export interface TableAction {
    state: TableActionState;
    remainingSeconds: number;
    /** true: sunucu yanıt verdi (gönderildi ya da az önce yapılmış). Geri sayımlı işlemde geri sayım sürerken iptal eder. */
    trigger: () => Promise<boolean>;
    /** Geri sayımlı işlem (useDelayedAction): gönderime kalan saniye; geri sayım yoksa null. */
    countdown?: number | null;
    /** Geri sayımı iptal eder (istek gitmez). */
    cancel?: () => void;
    /** Geri sayım az önce iptal edildi (kısa "İptal edildi" bildirimi için birkaç saniye true). */
    cancelled?: boolean;
}

/** Bekleme süresinde mi (gönderildi, tekrar için süre dolmadı). */
export const isWaiting = (action: TableAction) => action.state.status === 'done' && action.remainingSeconds > 0;

/** Geri sayım sürüyor mu (useDelayedAction). */
export const isCounting = (action: TableAction) => action.countdown != null;

/**
 * Yanlışlıkla dokunmaya karşı geri sayımlı işlem ("Garson çağır"): dokununca istek hemen gitmez, `seconds` saniye sayar;
 * iptal edilmezse gönderir. Yalnız cancel() ("İptal" düğmesi) iptal eder: sekme değiştirmek, yeniden dokunmak ya da
 * telefonun arka plana geçmesi geri sayımı durdurmaz. Sayfa kapanırsa (bileşen kalkar) istek gönderilemez.
 * Bağlantı yoksa geri sayım başlamaz; istek hemen denenir ve bilinen hata görünür.
 */
export function useDelayedAction(action: TableAction, seconds = 3): TableAction {
    const [countdown, setCountdown] = useState<number | null>(null);
    const [cancelledAt, setCancelledAt] = useState(0);
    const timer = useRef<number | null>(null);
    const settle = useRef<((sent: boolean) => void) | null>(null);
    const latest = useRef(action);
    useEffect(() => { latest.current = action; });

    const stop = useCallback(() => {
        if (timer.current != null) window.clearInterval(timer.current);
        timer.current = null;
        settle.current?.(false);
        settle.current = null;
    }, []);

    const cancel = useCallback(() => {
        if (timer.current == null) return;
        stop();
        setCountdown(null);
        setCancelledAt(Date.now());
    }, [stop]);

    const trigger = useCallback((): Promise<boolean> => {
        // Geri sayım sürerken yeniden dokunmak bir şey yapmaz (iptal yalnız "İptal" düğmesiyle).
        if (timer.current != null) return Promise.resolve(false);
        if (typeof navigator !== 'undefined' && !navigator.onLine) return latest.current.trigger();
        setCancelledAt(0);
        let left = seconds;
        setCountdown(left);
        return new Promise<boolean>(resolve => {
            settle.current = resolve;
            timer.current = window.setInterval(() => {
                left -= 1;
                if (left > 0) { setCountdown(left); return; }
                window.clearInterval(timer.current!);
                timer.current = null;
                settle.current = null;
                setCountdown(null);
                resolve(latest.current.trigger());
            }, 1000);
        });
    }, [seconds]);

    // Sayfa kapanınca (bileşen kalkınca) sayaç temizlenir.
    useEffect(() => () => stop(), [stop]);

    // "İptal edildi" birkaç saniye görünür.
    useEffect(() => {
        if (!cancelledAt) return;
        const t = window.setTimeout(() => setCancelledAt(0), 2500);
        return () => window.clearTimeout(t);
    }, [cancelledAt]);

    return { ...action, trigger, countdown, cancel, cancelled: cancelledAt > 0 };
}
