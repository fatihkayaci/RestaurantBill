import { toast } from 'sonner';
import type { SiteDraftImageSlot, SiteDraftTexts } from '@/features/customerSite/api/siteEditorService';
import type { BranchSite, PublicSite } from '@/features/customerSite/types';
import { normalizeSite } from '@/pages/public/site/useSite';
import { EXTERNAL_SOURCES, type SiteEditTarget, type SiteListName, type SiteTextField } from '@/pages/public/site/siteEditContext';

// Görsel site düzenleyicisinin modeli: sekmeler, taslak metinleri (liste kartları dahil), önizleme sitesi, fotoğraf
// yuvaları ve "Sitenizi güzelleştirin" eksiklerinin önizlemedeki yeri.

export const EDITOR_TABS = [
    { key: 'home', path: '/', label: 'Anasayfa' },
    { key: 'menu', path: '/menu', label: 'Menü' },
    { key: 'hakkimizda', path: '/hakkimizda', label: 'Hakkımızda' },
    { key: 'mekan', path: '/mekan', label: 'Mekân' },
    { key: 'iletisim', path: '/iletisim', label: 'İletişim' },
    { key: 'rezervasyon', path: '/rezervasyon', label: 'Rezervasyon' },
    // Sitede böyle bir sayfa yok: düzenleyicinin bütün sayfa kapaklarını bir arada gösterdiği sekme.
    { key: 'kapaklar', path: '/kapaklar', label: 'Sayfa kapakları' },
] as const;

export type EditorTab = typeof EDITOR_TABS[number]['key'];

/**
 * Düzenleyicide sekmesi olan sayfalar: yalnız burada değişen bir şey kalanlar. Menü, İletişim ve Rezervasyon'da kapak
 * dışında düzenlenen bir şey yok (ya da her şeyi başka sekmede/Genel ayarlar'da da var): bütün kapaklar
 * "Sayfa kapakları" sekmesinde. Önizle'de bütün sayfalar sitenin kendi menüsünden açılır.
 */
export const EDIT_TABS = EDITOR_TABS.filter(t => t.key === 'home' || t.key === 'hakkimizda' || t.key === 'mekan' || t.key === 'kapaklar');

export function tabByPath(path: string): EditorTab | null {
    return EDITOR_TABS.find(t => t.path === path)?.key ?? null;
}

export function tabPath(tab: EditorTab): string {
    return EDITOR_TABS.find(t => t.key === tab)!.path;
}

// ── Taslak metinleri ────────────────────────────────────────────────────────────────────────────

/** Sunucudaki taslaktan düzenlenen metinler (fotoğraflar hariç). */
export function toTexts(d: BranchSite): SiteDraftTexts {
    return {
        headline: d.headline ?? '', tagline: d.tagline ?? '', storyTitle: d.storyTitle ?? '', about: d.about ?? '',
        opensAt: d.opensAt, closesAt: d.closesAt, hoursNote: d.hoursNote ?? '', instagramUrl: d.instagramUrl ?? '',
        accentColor: d.accentColor ?? '', theme: d.theme ?? '', weeklyHours: d.weeklyHours ?? [],
        directionsNote: d.directionsNote ?? '', whatsappPhone: d.whatsappPhone ?? '', amenities: d.amenities ?? [],
        rating: d.rating ?? null, reviewCount: d.reviewCount ?? null, reviewsUrl: d.reviewsUrl ?? '',
        featuredReviews: d.featuredReviews ?? [], founderName: d.founderName ?? '', founderTitle: d.founderTitle ?? '',
        founderQuote: d.founderQuote ?? '', foundedYear: d.foundedYear ?? null, values: d.values ?? [], milestones: d.milestones ?? [],
        regionDetails: (d.regionDetails ?? []).map(r => ({ regionId: r.regionId, description: r.description ?? '' })),
        seoTitle: d.seoTitle ?? '', seoDescription: d.seoDescription ?? '',
    };
}

/** PUT gövdesi: boş saatler null, tamamen boş liste kartları (yeni eklenmiş, henüz yazılmamış) gönderilmez. */
export function toSaveBody(t: SiteDraftTexts): SiteDraftTexts {
    return {
        ...t,
        opensAt: t.opensAt || null,
        closesAt: t.closesAt || null,
        featuredReviews: t.featuredReviews.filter(r => r.text.trim() || r.author.trim()),
        values: t.values.filter(v => v.title.trim() || v.text.trim()),
        milestones: t.milestones.filter(m => m.text.trim()),
    };
}

/** Sunucuya gönderilmeden yakalanan hata (kaydetme bekletilir). */
export function textsProblem(t: SiteDraftTexts): string | null {
    if (t.weeklyHours.length === 0 && Boolean(t.opensAt) !== Boolean(t.closesAt)) return 'Açılış ve kapanış saatini birlikte girin.';
    if (t.weeklyHours.length > 0 && !t.weeklyHours.some(d => d.isOpen)) return 'Haftada en az bir gün açık olmalı.';
    return null;
}

export function getText(t: SiteDraftTexts, field: SiteTextField): string {
    const [kind, key, part] = field.split(':');
    if (kind === 'region') return t.regionDetails.find(r => r.regionId === key)?.description ?? '';
    const i = Number(key);
    if (kind === 'value') return t.values[i]?.[part as 'title' | 'text'] ?? '';
    if (kind === 'review') return t.featuredReviews[i]?.[part as 'text' | 'author' | 'source'] ?? '';
    if (kind === 'milestone') {
        const m = t.milestones[i];
        if (!m) return '';
        return part === 'year' ? (m.year ? String(m.year) : '') : m.text;
    }
    return t[field as 'headline'];
}

export function withText(t: SiteDraftTexts, field: SiteTextField, value: string): SiteDraftTexts {
    const [kind, key, part] = field.split(':');
    if (kind === 'region') {
        const exists = t.regionDetails.some(r => r.regionId === key);
        return {
            ...t,
            regionDetails: exists
                ? t.regionDetails.map(r => (r.regionId === key ? { ...r, description: value } : r))
                : [...t.regionDetails, { regionId: key, description: value }],
        };
    }
    const i = Number(key);
    if (kind === 'value') return { ...t, values: t.values.map((v, j) => (j === i ? { ...v, [part]: value } : v)) };
    if (kind === 'review') return { ...t, featuredReviews: t.featuredReviews.map((r, j) => (j === i ? { ...r, [part]: value } : r)) };
    if (kind === 'milestone') {
        return {
            ...t,
            milestones: t.milestones.map((m, j) => (j !== i ? m : part === 'year'
                ? { ...m, year: Number(value.replace(/\D/g, '').slice(0, 4)) || 0 }
                : { ...m, text: value })),
        };
    }
    return { ...t, [field]: value };
}

export type ListOp = { action: 'add' } | { action: 'remove'; index: number } | { action: 'move'; index: number; to: number };

function applyOp<T>(items: T[], op: ListOp, empty: T): T[] {
    if (op.action === 'add') return [...items, empty];
    if (op.action === 'remove') return items.filter((_, i) => i !== op.index);
    if (op.to < 0 || op.to >= items.length) return items;
    const next = [...items];
    [next[op.index], next[op.to]] = [next[op.to], next[op.index]];
    return next;
}

/** Liste kartı ekle/sil/taşı; eklenince yazılacak ilk alan döner. */
export function withListOp(t: SiteDraftTexts, list: SiteListName, op: ListOp): { texts: SiteDraftTexts; focus: SiteTextField | null } {
    switch (list) {
        case 'values':
            return { texts: { ...t, values: applyOp(t.values, op, { title: '', text: '' }) }, focus: op.action === 'add' ? `value:${t.values.length}:title` : null };
        case 'milestones':
            return {
                texts: { ...t, milestones: applyOp(t.milestones, op, { year: new Date().getFullYear(), text: '' }) },
                focus: op.action === 'add' ? `milestone:${t.milestones.length}:text` : null,
            };
        case 'reviews':
            return {
                texts: { ...t, featuredReviews: applyOp(t.featuredReviews, op, { author: '', text: '', source: 'Google' }) },
                focus: op.action === 'add' ? `review:${t.featuredReviews.length}:text` : null,
            };
    }
}

/** Önizlemenin sitesi: menü, masalar, adres yayındaki siteden; site içeriği taslaktan (yazılar yereldeki son hâlinden). */
export function buildPreviewSite(base: PublicSite, draft: BranchSite, texts: SiteDraftTexts): PublicSite {
    const descriptions = new Map(texts.regionDetails.map(r => [r.regionId, r.description]));
    const regionDetails = draft.regionDetails.map(r => ({ ...r, description: descriptions.get(r.regionId) ?? r.description }));
    const byId = new Map(regionDetails.map(r => [r.regionId, r]));
    return normalizeSite({
        ...base,
        site: { ...draft, ...texts, regionDetails },
        regions: base.regions.map(r => {
            const d = byId.get(r.id);
            return d ? { ...r, photoUrl: d.photoUrl, description: d.description } : r;
        }),
    });
}

// ── Fotoğraf yuvaları ───────────────────────────────────────────────────────────────────────────

export interface PhotoMeta {
    title: string;
    /** Boşken ne görünür / nasıl fotoğraf. */
    hint: string;
    removeLabel: string;
}

const hero = (title: string): PhotoMeta => ({
    title, hint: 'Bu sayfanın kendi kapağı. Boşken sitenin kapak fotoğrafı görünür.', removeLabel: 'Kaldır (kapağa dön)',
});

export const PHOTO_META: Record<SiteDraftImageSlot, PhotoMeta> = {
    cover: { title: 'Kapak fotoğrafı', hint: 'Anasayfanın ve kendi kapağı olmayan sayfaların kapağı. Kaldırılırsa menü fotoğraflarından kolaj görünür.', removeLabel: 'Kaldır' },
    about: { title: 'Hikâye fotoğrafı', hint: 'Hikâyenin yanında. Boşken galerinin ilk fotoğrafı ya da tabaklarınızdan kolaj görünür.', removeLabel: 'Kaldır' },
    founder: { title: 'Usta portresi', hint: 'Dikey, iyi ışıkta bir fotoğraf.', removeLabel: 'Kaldır' },
    share: { title: 'Paylaşım görseli', hint: 'Google ve WhatsApp önizlemesi. Boşken kapak fotoğrafı kullanılır.', removeLabel: 'Otomatiğe dön' },
    'hero-menu': hero('Menü kapağı'),
    'hero-hakkimizda': hero('Hakkımızda kapağı'),
    'hero-mekan': { title: 'Mekân kapağı', hint: 'Mekân sayfasının kapağı. Boşken galerinin ilk fotoğrafı, o da yoksa hikâye ya da kapak fotoğrafı görünür.', removeLabel: 'Kaldır' },
    'hero-iletisim': hero('İletişim kapağı'),
    'hero-rezervasyon': hero('Rezervasyon kapağı'),
};

/** Yuvanın taslaktaki görseli (boş = girilmemiş). */
export function slotUrl(d: BranchSite, slot: SiteDraftImageSlot): string {
    switch (slot) {
        case 'cover': return d.coverImageUrl;
        case 'about': return d.aboutImageUrl;
        case 'founder': return d.founderPhotoUrl;
        case 'share': return d.shareImageUrl;
        case 'hero-menu': return d.menuHeroUrl;
        case 'hero-hakkimizda': return d.aboutHeroUrl;
        case 'hero-mekan': return d.venueHeroUrl;
        case 'hero-iletisim': return d.contactHeroUrl;
        case 'hero-rezervasyon': return d.reservationHeroUrl;
    }
}

/** Hazır görsel mi: adres /shared/stock/ içeriyorsa ("Temsili görsel"). */
export function isStockUrl(url: string): boolean {
    return url.includes('/shared/stock/');
}

/** Pencere türü: fotoğraf menüsü, küçük düzenleyici ya da "başka sayfadan gelir". Yazılar (text:) pencere açmaz. */
export function popoverKind(target: SiteEditTarget): 'photo' | 'editor' | 'external' | null {
    if (target.startsWith('photo:') || target.startsWith('gallery:') || target.startsWith('region:')) return 'photo';
    if (target.startsWith('external:')) return EXTERNAL_SOURCES[target.slice(9)] ? 'external' : null;
    if (['hours', 'rating', 'contact', 'year', 'amenities'].includes(target)) return 'editor';
    return null;
}

// ── "Sitenizi güzelleştirin" eksikleri → önizlemedeki yeri ─────────────────────────────────────

/** Madde anahtarı (backend SiteCompleteness) → sekme ve hedef (ya da yazı alanı). */
/** `admin`: önizlemede yeri yoksa (ürün fotoğrafları) ya da bölüm hiç yoksa açılacak admin sayfası. */
export const COMPLETENESS_TARGETS: Record<string, { tab: EditorTab; target?: SiteEditTarget; text?: SiteTextField; admin?: string }> = {
    cover: { tab: 'home', target: 'photo:cover' },
    gallery: { tab: 'mekan', target: 'gallery:add' },
    story: { tab: 'home', text: 'storyTitle' },
    hours: { tab: 'home', target: 'hours' },
    aboutPhoto: { tab: 'hakkimizda', target: 'photo:about' },
    rating: { tab: 'home', target: 'rating' },
    whatsapp: { tab: 'home', target: 'contact' },
    founder: { tab: 'hakkimizda', text: 'founderName' },
    reviews: { tab: 'home', target: 'list:reviews' },
    directions: { tab: 'mekan', text: 'directionsNote' },
    amenities: { tab: 'mekan', target: 'amenities' },
    regions: { tab: 'mekan', target: 'list:regions', admin: '/admin/tables' },
    values: { tab: 'hakkimizda', target: 'list:values' },
    history: { tab: 'hakkimizda', target: 'list:milestones' },
    instagram: { tab: 'home', target: 'contact' },
    productPhotos: { tab: 'home', admin: '/admin/menu?fotografsiz=1' },
};

// ── Yerinde yazılan alanların adları (telefonda yazarken üst çubuk) ────────────────────────────

const TEXT_LABELS: Record<string, string> = {
    headline: 'Büyük başlık', tagline: 'Alt başlık', storyTitle: 'Büyük slogan', about: 'Kısa hikâye', hoursNote: 'Saat notu',
    directionsNote: 'Nasıl gelinir', founderName: 'Ustanın adı', founderTitle: 'Ustanın unvanı', founderQuote: 'Ustanın sözü',
    region: 'Bölüm açıklaması', value: 'Değer', milestone: 'Kilometre taşı', review: 'Yorum',
};

export function textFieldLabel(field: SiteTextField): string {
    return TEXT_LABELS[field] ?? TEXT_LABELS[field.split(':')[0]] ?? field;
}

// ── Yükleme ─────────────────────────────────────────────────────────────────────────────────────

const MAX_UPLOAD_BYTES = 10_000_000;

/** 10 MB'tan büyükse uyarır (sunucu sınırı); yükleme yapılmaz. */
export function tooBig(file: File): boolean {
    if (file.size <= MAX_UPLOAD_BYTES) return false;
    toast.error('Görsel en fazla 10 MB olabilir.');
    return true;
}

// ── Zaman ───────────────────────────────────────────────────────────────────────────────────────

const timeFmt = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

/** "az önce", "5 dk önce", "bugün 14:32", "dün 09:10", "12 Kas 18:00". */
export function relativeTime(iso: string, now = new Date()): string {
    const date = new Date(iso);
    const seconds = (now.getTime() - date.getTime()) / 1000;
    if (seconds < 60) return 'az önce';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay(date, now)) return `bugün ${timeFmt.format(date)}`;
    if (sameDay(date, yesterday)) return `dün ${timeFmt.format(date)}`;
    return `${dayFmt.format(date)} ${timeFmt.format(date)}`;
}
