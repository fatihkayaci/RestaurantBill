import { useCallback, useEffect, useState } from 'react';

// Kenar çubuğu bölümlerinin açık/kapalı durumu: kullanıcı başına localStorage'da, bölüm anahtarıyla saklanır.
// Varsayılan: hepsi açık. Yalnızca kapatılanlar yazılır.
const storageKey = (userId: string | null) => `rb.sidebarGroups.${userId ?? 'anon'}`;

function readClosed(userId: string | null): string[] {
    try {
        const raw = localStorage.getItem(storageKey(userId));
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

// activeKey: aktif rotayı içeren bölümün anahtarı. Kullanıcı kapalı bir bölüme girerse o bölüm açılır.
export function useSidebarGroups(userId: string | null, activeKey: string | undefined) {
    const [closed, setClosed] = useState<string[]>(() => readClosed(userId));
    const [seenActive, setSeenActive] = useState<string | undefined>(undefined);

    // Render sırasında ayarlama (effect içinde setState yerine): aktif bölüm değişince açılır.
    if (seenActive !== activeKey) {
        setSeenActive(activeKey);
        if (activeKey && closed.includes(activeKey)) setClosed(closed.filter(k => k !== activeKey));
    }

    useEffect(() => {
        try {
            localStorage.setItem(storageKey(userId), JSON.stringify(closed));
        } catch {
            // Depolama kapalıysa durum yalnızca bu oturumda kalır.
        }
    }, [userId, closed]);

    const isOpen = useCallback((key: string) => !closed.includes(key), [closed]);
    const toggle = useCallback((key: string) => {
        setClosed(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    }, []);

    return { isOpen, toggle };
}

// md (768px) ve üstü: daraltılmış ikon modunda akordeon devre dışı kalır; mobil çekmece her zaman akordeon.
export function useIsDesktop() {
    const query = '(min-width: 768px)';
    const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setIsDesktop(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return isDesktop;
}
