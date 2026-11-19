import { useEffect, useSyncExternalStore } from 'react';
import { BRANCHES_CHANGED_EVENT, branchService } from './api/branchService';
import type { Branch } from './types';
import { getSession } from '@/lib/auth';

// Oturumdaki kullanıcının şubeleri; kabuk, şube seçici ve sahibin şirket sayfaları kapısı aynı listeyi paylaşır.
// Şube eklenip silinince (BRANCHES_CHANGED_EVENT) liste yeniden çekilir ve bütün kullananlar güncellenir.
// Liste oturumdaki kullanıcı + şirkete bağlıdır; çıkış yapıp başka hesapla girilince eski liste kullanılmaz.

let branches: Branch[] | null = null;
let cacheKey: string | null = null;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach(l => l());
}

function sessionKey(): string | null {
    const session = getSession();
    return session ? `${session.userId}:${session.companyId}` : null;
}

function load() {
    const key = sessionKey();
    if (key === null) return;
    if (key !== cacheKey) { cacheKey = key; branches = null; loading = false; }
    if (loading) return;
    loading = true;
    branchService.getMyBranches()
        .then(list => { if (sessionKey() === key) { branches = list; emit(); } })
        .catch(() => { if (sessionKey() === key && branches === null) { branches = []; emit(); } })
        .finally(() => { if (cacheKey === key) loading = false; });
}

function getSnapshot(): Branch[] | null {
    return cacheKey !== null && cacheKey === sessionKey() ? branches : null;
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

if (typeof window !== 'undefined') {
    window.addEventListener(BRANCHES_CHANGED_EVENT, load);
}

/** null: henüz yüklenmedi. */
export function useMyBranches(): Branch[] | null {
    const value = useSyncExternalStore(subscribe, getSnapshot);
    useEffect(() => {
        if (getSnapshot() === null) load();
    });
    return value;
}

/**
 * Tek şubeli sahip: "Tümü" ile şube ayrımı yok, tek birleşik menü (şube menüsü + şirket sayfaları) şube kapsamında çalışır.
 * Şube listesi yüklenmeden false döner.
 */
export function isSingleBranchOwner(role: string | null | undefined, list: Branch[] | null): boolean {
    return role === 'Owner' && list !== null && list.length === 1;
}
