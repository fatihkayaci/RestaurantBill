import { useCallback, useEffect, useState } from 'react';

// Kenar çubuğu bölümlerinin açık/kapalı durumu: kullanıcı başına localStorage'da, bölüm anahtarıyla saklanır.
// Varsayılan: hepsi kapalı (yalnızca aktif rotanın bölümü açılır). Yalnızca açılanlar yazılır.
// Anahtar "v2": eski sürüm kapatılanları tutuyordu, karışmasın diye yeni anahtar.
const storageKey = (userId: string | null) => `rb.sidebarGroups.v2.${userId ?? 'anon'}`;

function readOpen(userId: string | null): string[] {
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
    const [open, setOpen] = useState<string[]>(() => readOpen(userId));
    const [seenActive, setSeenActive] = useState<string | undefined>(undefined);

    // Render sırasında ayarlama (effect içinde setState yerine): aktif bölüm değişince açılır.
    if (seenActive !== activeKey) {
        setSeenActive(activeKey);
        if (activeKey && !open.includes(activeKey)) setOpen([...open, activeKey]);
    }

    useEffect(() => {
        try {
            localStorage.setItem(storageKey(userId), JSON.stringify(open));
        } catch {
            // Depolama kapalıysa durum yalnızca bu oturumda kalır.
        }
    }, [userId, open]);

    const isOpen = useCallback((key: string) => open.includes(key), [open]);
    const toggle = useCallback((key: string) => {
        setOpen(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
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
