import { useEffect, useState } from 'react';
import { contactMessageService } from '@/features/contactMessages/api/contactMessageService';
import { DATA_CHANGED_EVENT } from '@/lib/axiosInstance';

const REFRESH_MS = 60_000;

// Yan menüdeki "Şikayet ve Öneriler" rozeti: okunmamış mesaj sayısı. Açılışta, her yazma isteğinden sonra
// (okundu/sil) ve dakikada bir yenilenir. Hata olursa rozet sessizce gizli kalır.
export function useUnreadContactMessages(enabled: boolean): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        const load = () => {
            contactMessageService.getUnreadCount()
                .then(value => { if (!cancelled) setCount(value); })
                .catch(() => {});
        };
        load();
        const timer = window.setInterval(load, REFRESH_MS);
        window.addEventListener(DATA_CHANGED_EVENT, load);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
            window.removeEventListener(DATA_CHANGED_EVENT, load);
        };
    }, [enabled]);

    return enabled ? count : 0;
}
