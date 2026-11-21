import { useEffect, useState } from 'react';
import { publicService } from '@/features/customerSite/api/publicService';
import type { BranchSite, PublicSite, ReservationStatusInfo, SiteDayHours } from '@/features/customerSite/types';
import { getApiErrorMessage } from '@/lib/apiError';
import { getTenantSlug } from '@/lib/tenant';
import { useSitePreview } from './siteEditContext';

// Sitenin ana sayfası ve menü sayfası aynı veriyi kullanır: şube bilgisi, site içeriği, menü, masalar.
// Admin'deki görsel düzenleyicinin önizlemesinde site sunucudan çekilmez: taslak SitePreviewContext'ten gelir.
export function useSite() {
    const preview = useSitePreview();
    const [site, setSite] = useState<PublicSite | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (preview) return;
        let cancelled = false;
        publicService.getSite()
            .then(data => { if (!cancelled) setSite(normalizeSite(withDevDesign(data))); })
            .catch(err => { if (!cancelled) setError(getApiErrorMessage(err, 'Sayfa yüklenemedi. İnternet bağlantınızı kontrol edip yenileyin.')); });
        return () => { cancelled = true; };
    }, [preview]);

    return preview ? { site: preview.site, error: null } : { site, error };
}

/** Yalnız geliştirme sunucusunda: `?tasarim=sophra` sitenin tasarımını bu sekmede değiştirir (veritabanına dokunmadan
 *  tasarım denemek için; sekme kapanana kadar sürer); production derlemesinde hiç okunmaz. */
function withDevDesign(data: PublicSite): PublicSite {
    if (!import.meta.env.DEV) return data;
    let design = new URLSearchParams(window.location.search).get('tasarim');
    try {
        if (design) sessionStorage.setItem('rb:dev-design', design);
        else design = sessionStorage.getItem('rb:dev-design');
    } catch { /* özel pencere */ }
    return design && data.site ? { ...data, site: { ...data.site, design } } : data;
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
    const inPreview = useSitePreview() !== null;
    const [mine, setMine] = useState<ReservationStatusInfo[]>([]);

    useEffect(() => {
        // Düzenleyicinin önizlemesinde bu cihazın rezervasyonları gösterilmez.
        if (inPreview) return;
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
    }, [inPreview]);

    const add = (created: ReservationStatusInfo) => {
        setMine(prev => {
            const next = [created, ...prev.filter(r => r.accessToken !== created.accessToken)];
            saveTokens(next.map(r => r.accessToken));
            return next;
        });
    };

    return { mine, add };
}

/** Eski sunucudan ya da eksik gelen ek site alanlarını boş değerle doldurur (sayfalar her alanı güvenle okur). */
export function normalizeSite(site: PublicSite): PublicSite {
    const c: Partial<BranchSite> = site.site ?? {};
    return {
        ...site,
        site: {
            ...(c as BranchSite),
            theme: c.theme ?? '',
            design: c.design ?? '',
            galleryImageUrls: c.galleryImageUrls ?? [],
            weeklyHours: c.weeklyHours ?? [],
            directionsNote: c.directionsNote ?? '',
            whatsappPhone: c.whatsappPhone ?? '',
            amenities: c.amenities ?? [],
            hiddenFaqs: c.hiddenFaqs ?? [],
            homeSections: c.homeSections ?? [],
            rating: c.rating ?? null,
            reviewCount: c.reviewCount ?? null,
            reviewsUrl: c.reviewsUrl ?? '',
            featuredReviews: c.featuredReviews ?? [],
            founderPhotoUrl: c.founderPhotoUrl ?? '',
            founderName: c.founderName ?? '',
            founderTitle: c.founderTitle ?? '',
            founderQuote: c.founderQuote ?? '',
            foundedYear: c.foundedYear ?? null,
            values: c.values ?? [],
            milestones: c.milestones ?? [],
            regionDetails: c.regionDetails ?? [],
            seoTitle: c.seoTitle ?? '',
            seoDescription: c.seoDescription ?? '',
            shareImageUrl: c.shareImageUrl ?? '',
            menuHeroUrl: c.menuHeroUrl ?? '',
            aboutHeroUrl: c.aboutHeroUrl ?? '',
            venueHeroUrl: c.venueHeroUrl ?? '',
            contactHeroUrl: c.contactHeroUrl ?? '',
            reservationHeroUrl: c.reservationHeroUrl ?? '',
        },
    };
}

// ── Çalışma saatleri ─────────────────────────────────────────────────────────────────────────────
export const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
/** Pazartesi → Pazar (Date.getDay sırası). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface ScheduleRow {
    day: number;
    label: string;
    isOpen: boolean;
    /** "09:00 – 23:30" ya da "Kapalı" */
    text: string;
    isToday: boolean;
}

/** Şubenin bugünü (sunucu yerel saatiyle; eski sunucuda tarayıcının günü). */
export function todayIndex(site: PublicSite): number {
    return site.today ?? new Date().getDay();
}

function range(opens: string, closes: string): string {
    return opens === closes ? '24 saat açık' : `${opens} – ${closes}`;
}

/** Haftalık saat girildiyse 7 satır (Pazartesi başta); "her gün aynı" ise tek aralıktan 7 aynı satır; saat yoksa null. */
export function weekSchedule(site: PublicSite): ScheduleRow[] | null {
    const today = todayIndex(site);
    const weekly: SiteDayHours[] = site.site.weeklyHours ?? [];
    if (weekly.length === 7) {
        return WEEK_ORDER.map(day => {
            const d = weekly.find(w => w.day === day);
            const open = Boolean(d?.isOpen);
            return { day, label: DAY_NAMES[day], isOpen: open, text: open && d ? range(d.opens, d.closes) : 'Kapalı', isToday: day === today };
        });
    }
    const { opensAt, closesAt } = site.site;
    if (!opensAt || !closesAt) return null;
    return WEEK_ORDER.map(day => ({ day, label: DAY_NAMES[day], isOpen: true, text: range(opensAt, closesAt), isToday: day === today }));
}

/** Bütün günler aynı aralıksa (ya da tek aralık girildiyse) true: "Her gün 09:00 – 23:30" yazılır. */
export function isUniformWeek(site: PublicSite): boolean {
    const rows = weekSchedule(site);
    return !!rows && rows.every(r => r.isOpen && r.text === rows[0].text);
}

/** Kısa saat özeti: { label: "Her gün" | "Bugün", text: "09:00 – 23:30" | "Kapalı" }; saat yoksa null. */
export function hoursSummary(site: PublicSite): { label: string; text: string } | null {
    const rows = weekSchedule(site);
    if (!rows) return null;
    if (isUniformWeek(site)) return { label: 'Her gün', text: rows[0].text };
    const today = rows.find(r => r.isToday) ?? rows[0];
    return { label: 'Bugün', text: today.text };
}

/** "09:00 – 23:30" (bugünün ya da her günün aralığı); saat girilmemişse null. Bugün kapalıysa "Kapalı". */
export function hoursText(site: PublicSite): string | null {
    return hoursSummary(site)?.text ?? null;
}

/** "Her gün 09:00 – 23:30" ya da "Bugün 12:00 – 23:30"; saat yoksa null. */
export function hoursLine(site: PublicSite): string | null {
    const summary = hoursSummary(site);
    return summary ? `${summary.label} ${summary.text}` : null;
}

function minutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

/** Açık günlerin ortalama açık saati (gece yarısını aşan aralık dahil): 14,5. Saat yoksa null. */
export function averageOpenHours(site: PublicSite): number | null {
    const weekly = site.site.weeklyHours ?? [];
    const spans = weekly.length === 7
        ? weekly.filter(d => d.isOpen).map(d => [d.opens, d.closes] as const)
        : site.site.opensAt && site.site.closesAt ? [[site.site.opensAt, site.site.closesAt] as const] : [];
    if (spans.length === 0) return null;
    const total = spans.reduce((sum, [o, c]) => {
        const diff = minutes(c) - minutes(o);
        return sum + (diff <= 0 ? diff + 24 * 60 : diff);
    }, 0);
    return Math.round((total / spans.length / 60) * 2) / 2;
}

export function fullAddress(site: PublicSite): string {
    const location = [site.district, site.city].filter(Boolean).join(', ');
    return [site.openAddress, location].filter(Boolean).join(', ');
}

export function restaurantName(site: PublicSite): string {
    return site.companyName || site.branchName;
}

// ── Sekme başlığı ────────────────────────────────────────────────────────────────────────────────

const PAGE_TITLES: Partial<Record<string, string>> = {
    menu: 'Menü', hakkimizda: 'Hakkımızda', mekan: 'Mekân', iletisim: 'İletişim', rezervasyon: 'Rezervasyon',
    'rezervasyon-sorgula': 'Rezervasyon sorgula', siparis: 'Paket sipariş',
};

/** Ana sayfa sitenin başlığını alır (yayındaki SEO başlığı); alt sayfalar "Menü · Ocak". */
export function sitePageTitle(site: PublicSite, page: string): string {
    const name = restaurantName(site);
    const label = PAGE_TITLES[page];
    if (label) return `${label} · ${name}`;
    return site.seo?.title || name;
}

/** Tarayıcı sekmesinin başlığı (müşteri sitesi). Düzenleyicinin önizlemesinde admin'in başlığına dokunulmaz. */
export function useSiteDocumentTitle(site: PublicSite, page: string) {
    const inPreview = useSitePreview() !== null;
    const title = sitePageTitle(site, page);
    useEffect(() => {
        if (inPreview) return;
        const previous = document.title;
        document.title = title;
        return () => { document.title = previous; };
    }, [inPreview, title]);
}
