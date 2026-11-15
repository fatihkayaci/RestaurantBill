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

// ── Bu cihazdan gönderilen rezervasyon talepleri (yalnız bağlantı anahtarları, tarayıcıda) ─────────
// Anahtar rezervasyon sayfasının (/rezervasyon/:token) gizli parçasıdır; kimlik değildir. Eski sürümün kimlik listesi
// (rb:reservations:*) artık okunmaz ve silinir: kimlikle sorgu güvenli değildi.
const MAX_SAVED = 5;
const savedKey = () => `rb:reservation-links:${getTenantSlug() ?? 'dev'}`;
const legacyKey = () => `rb:reservations:${getTenantSlug() ?? 'dev'}`;

function readSavedTokens(): string[] {
    try {
        localStorage.removeItem(legacyKey());
        const parsed: unknown = JSON.parse(localStorage.getItem(savedKey()) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
    } catch { return []; }
}

function saveTokens(tokens: string[]) {
    try { localStorage.setItem(savedKey(), JSON.stringify(tokens.slice(0, MAX_SAVED))); } catch { /* özel pencere */ }
}

/** Rezervasyon sayfası açıldığında bağlantı bu cihazın listesine eklenir (başka cihazdan gelen bağlantı da). */
export function rememberReservationToken(token: string) {
    saveTokens([token, ...readSavedTokens().filter(t => t !== token)]);
}

export function useMyReservations() {
    const [mine, setMine] = useState<ReservationStatusInfo[]>([]);

    useEffect(() => {
        let cancelled = false;
        const tokens = readSavedTokens();
        if (tokens.length === 0) return;
        Promise.all(tokens.map(token => publicService.getReservationByToken(token)
            .then((r): ReservationStatusInfo => ({
                accessToken: token, code: r.code, status: r.status, tableName: r.tableName, guestName: r.guestName,
                date: r.date, time: r.time, endTime: r.endTime, partySize: r.partySize,
            }))
            .catch(() => null)))
            .then(results => {
                if (cancelled) return;
                const found = results.filter((r): r is ReservationStatusInfo => r !== null);
                setMine(found);
                saveTokens(found.map(r => r.accessToken));
            });
        return () => { cancelled = true; };
    }, []);

    const add = (created: ReservationStatusInfo) => {
        setMine(prev => {
            const next = [created, ...prev.filter(r => r.accessToken !== created.accessToken)];
            saveTokens(next.map(r => r.accessToken));
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
