import { useEffect, useState } from 'react';
import { publicService } from '@/features/customerSite/api/publicService';
import type { PublicSite, ReservationStatusInfo } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { getTenantSlug } from '@/lib/tenant';

// Sitenin ana sayfası ve menü sayfası aynı veriyi kullanır: şube bilgisi, site içeriği, menü, masalar.
export function useSite() {
    const [site, setSite] = useState<PublicSite | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        publicService.getSite()
            .then(data => { if (!cancelled) setSite(data); })
            .catch(err => { if (!cancelled) setError(getApiErrorMessage(err, 'Sayfa yüklenemedi. İnternet bağlantınızı kontrol edip yenileyin.')); });
        return () => { cancelled = true; };
    }, []);

    return { site, error };
}

// ── Bu cihazdan gönderilen rezervasyon talepleri (yalnız kimlikler, tarayıcıda) ────────────────────
const MAX_SAVED = 5;
const savedKey = () => `rb:reservations:${getTenantSlug() ?? 'dev'}`;

function readSavedIds(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(savedKey()) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch { return []; }
}

function saveIds(ids: string[]) {
    try { localStorage.setItem(savedKey(), JSON.stringify(ids.slice(0, MAX_SAVED))); } catch { /* özel pencere */ }
}

export function useMyReservations() {
    const [mine, setMine] = useState<ReservationStatusInfo[]>([]);

    useEffect(() => {
        let cancelled = false;
        const ids = readSavedIds();
        if (ids.length === 0) return;
        Promise.all(ids.map(id => publicService.getReservationStatus(id).catch(() => null)))
            .then(results => {
                if (cancelled) return;
                const found = results.filter((r): r is ReservationStatusInfo => r !== null);
                setMine(found);
                saveIds(found.map(r => r.id));
            });
        return () => { cancelled = true; };
    }, []);

    const add = (created: ReservationStatusInfo) => {
        setMine(prev => {
            const next = [created, ...prev.filter(r => r.id !== created.id)];
            saveIds(next.map(r => r.id));
            return next;
        });
    };

    return { mine, add };
}

/** "08:00 – 23:00"; saat girilmemişse null. */
export function hoursText(site: PublicSite): string | null {
    const { opensAt, closesAt } = site.site;
    return opensAt && closesAt ? `${opensAt} – ${closesAt}` : null;
}

export function fullAddress(site: PublicSite): string {
    const location = [site.district, site.city].filter(Boolean).join(', ');
    return [site.openAddress, location].filter(Boolean).join(', ');
}

export function restaurantName(site: PublicSite): string {
    return site.companyName || site.branchName;
}
