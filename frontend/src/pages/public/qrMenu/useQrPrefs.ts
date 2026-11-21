import { useCallback, useState } from 'react';

// Masa menüsünün yalnız bu telefonda tutulan tercihi: kategori sayfasının ızgara/liste görünümü.
// Sunucuya gitmez; özel pencerede ya da depolama kapalıysa yalnız bu oturumda kalır.

const VIEW_KEY = 'rb:qr-view';

function read<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : fallback;
    } catch {
        return fallback;
    }
}

function write(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* depolama kapalı: yalnız bu oturum */ }
}

export type QrView = 'grid' | 'list';

export function useViewPreference() {
    const [view, setViewState] = useState<QrView>(() => read<QrView>(VIEW_KEY, 'grid') === 'list' ? 'list' : 'grid');
    const setView = useCallback((next: QrView) => {
        setViewState(next);
        write(VIEW_KEY, next);
    }, []);
    return [view, setView] as const;
}
