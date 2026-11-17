import { createContext, useContext } from 'react';
import type { PublicSite } from '@/features/customerSite/types';

// Admin'deki görsel site düzenleyicisinin sitenin içindeki katmanı: bağlamlar, sınırlar ve "bu bilgi nereden gelir"
// tanımları. Bileşenler: siteEdit.tsx. Müşteri sitesinde bağlamlar boştur (null) ve site birebir eskisi gibi çizilir.

// ── Önizleme: site verisi ve pencere ────────────────────────────────────────────────────────────

/** Düzenleyicinin önizlemesi: sayfalar siteyi sunucudan çekmek yerine buradaki taslaktan çizer. */
export interface SitePreview {
    site: PublicSite;
    /** Önizleme çerçevesinin penceresi (kaydırma, odak, ölçüler buna göre). */
    win: Window;
}

export const SitePreviewContext = createContext<SitePreview | null>(null);

export function useSitePreview(): SitePreview | null {
    return useContext(SitePreviewContext);
}

/** Sitenin çizildiği pencere: müşteri sitesinde `window`, düzenleyicide önizleme çerçevesinin penceresi. */
export function useSiteWindow(): Window {
    return useContext(SitePreviewContext)?.win ?? window;
}

// ── Düzenleme ───────────────────────────────────────────────────────────────────────────────────

/**
 * Yerinde yazılan alanlar. `region:{id}` bölümün kısa açıklaması; liste kartları `value:{i}:title|text`,
 * `milestone:{i}:year|text`, `review:{i}:text|author|source`.
 */
export type SiteTextField =
    | 'headline' | 'tagline' | 'storyTitle' | 'about' | 'hoursNote' | 'directionsNote'
    | 'founderName' | 'founderTitle' | 'founderQuote' | `region:${string}`
    | `value:${number}:${'title' | 'text'}` | `milestone:${number}:${'year' | 'text'}` | `review:${number}:${'text' | 'author' | 'source'}`;

/**
 * Tıklanınca önizlemenin üstünde küçük bir pencere açan hedefler:
 * - `photo:cover|about|founder|share|hero-menu|hero-hakkimizda|hero-mekan|hero-iletisim|hero-rezervasyon`,
 *   `gallery:{i}`, `gallery:add`, `region:{id}` → fotoğraf menüsü (Yükle · Hazır görsellerden seç · Kaldır)
 * - `hours`, `rating`, `contact`, `year`, `amenities` → küçük düzenleyici
 * - `external:{kaynak}` → "Bu bilgi … sayfasından değişir" (EXTERNAL_SOURCES)
 * - yazı düzenlenirken `text:{alan}` (pencere yok)
 */
export type SiteEditTarget = string;

/** Önizleme penceresindeki konum (iframe'in görünür alanına göre, CSS pikseli). */
export interface EditAnchor {
    top: number;
    left: number;
    width: number;
    height: number;
}

export type SiteListName = 'values' | 'milestones' | 'reviews';

export interface SiteEditApi {
    /** Boş alanlar kesikli kart olarak görünsün mü ("Boş alanları göster"). */
    showEmpty: boolean;
    selected: SiteEditTarget | null;
    /** Seçer; `anchor`: tıklanan öğenin konumu (pencere bunun yanında açılır). */
    select: (target: SiteEditTarget | null, anchor?: EditAnchor | null) => void;
    setText: (field: SiteTextField, value: string) => void;
    /** Liste kartı ekle / sil / taşı (değerler, kilometre taşları, yorumlar). */
    listOp: (list: SiteListName, op: { action: 'add' } | { action: 'remove'; index: number } | { action: 'move'; index: number; to: number }) => void;
    /** Başka bir admin sayfasını açar (ürünler, ayarlar…). */
    openAdmin: (path: string) => void;
    /** Düzenleyiciden "bu yazıyı düzenle" isteği: alan ve her istekte artan sayaç. */
    focusRequest: { field: SiteTextField; n: number } | null;
    /** Düzenleyiciden "bu öğeyi göster" isteği (eksikler listesi): öğeye kaydırır ve seçer. */
    revealRequest: { target: SiteEditTarget; n: number } | null;
}

export const SiteEditContext = createContext<SiteEditApi | null>(null);

/** Düzenleyicinin içinde ve düzenleme kipindeyse API; müşteri sitesinde ve "Önizle"de null. */
export function useSiteEdit(): SiteEditApi | null {
    return useContext(SiteEditContext);
}

/** Sınırlar backend (Branch / SiteContent) ile aynı. */
export const SITE_LIMITS = {
    headline: 80, tagline: 160, storyTitle: 120, about: 800, hoursNote: 80,
    directionsNote: 200, whatsapp: 20, reviewsUrl: 300, gallery: 12,
    review: { author: 40, text: 280, source: 30, max: 3 },
    founderName: 60, founderTitle: 60, founderQuote: 240,
    value: { title: 40, text: 140, max: 3 },
    milestone: { text: 140, max: 5 },
    regionDescription: 160,
    seoTitle: 100, seoDescription: 320,
} as const;

export function textLimit(field: SiteTextField): number {
    const [kind, , part] = field.split(':');
    if (kind === 'region') return SITE_LIMITS.regionDescription;
    if (kind === 'value') return part === 'title' ? SITE_LIMITS.value.title : SITE_LIMITS.value.text;
    if (kind === 'milestone') return part === 'year' ? 4 : SITE_LIMITS.milestone.text;
    if (kind === 'review') return SITE_LIMITS.review[part as 'text' | 'author' | 'source'];
    return SITE_LIMITS[field as 'headline'];
}

/** Sitede değiştirilmeyen bilgilerin admin sayfaları. */
export const ADMIN_PATHS = {
    restaurant: '/admin/settings?sekme=restoran',
    menu: '/admin/menu',
    setMenus: '/admin/set-menus',
    reservationRules: '/admin/settings?sekme=rezervasyon',
    onlineOrdering: '/admin/settings?sekme=online',
    tables: '/admin/tables',
    reservations: '/admin/reservations',
    messages: '/admin/contact-messages',
} as const;

export interface ExternalSource {
    /** Üstüne gelince gri etiket: "Ayarlar'da değişir". */
    hover: string;
    title: string;
    text: string;
    links: { label: string; to: string }[];
    /** Bu düzenleyicide değişen ilgili alan (ör. kuruluş yılı). */
    edit?: { label: string; target: SiteEditTarget };
}

/** Önizlemede tıklanan ama burada değişmeyen bilgiler: nereden değiştiği ve oraya bağlantı. */
export const EXTERNAL_SOURCES: Record<string, ExternalSource> = {
    restaurant: { hover: "Ayarlar'da değişir", title: 'Restoran bilgisi', text: "Restoran adı, adres ve telefon Ayarlar → Restoran sayfasından değişir.", links: [{ label: 'Ayarlar', to: ADMIN_PATHS.restaurant }] },
    menu: { hover: "Yemeklerimiz'de değişir", title: 'Menüden gelir', text: 'Ürünler, kategoriler, fiyatlar ve ürün fotoğrafları Yemeklerimiz sayfasından değişir.', links: [{ label: 'Yemeklerimiz', to: ADMIN_PATHS.menu }] },
    setMenus: { hover: 'Set menülerde değişir', title: 'Hazır menüler', text: 'Hazır menüler Set menüler sayfasından değişir.', links: [{ label: 'Set menüler', to: ADMIN_PATHS.setMenus }] },
    reservation: { hover: 'Rezervasyon ayarlarında değişir', title: 'Rezervasyon', text: 'Online rezervasyonun açık olması, günler, saatler ve kişi sınırı Ayarlar → Rezervasyon sayfasından değişir.', links: [{ label: 'Rezervasyon ayarları', to: ADMIN_PATHS.reservationRules }, { label: 'Gelen rezervasyonlar', to: ADMIN_PATHS.reservations }] },
    online: { hover: 'Online sipariş ayarlarında değişir', title: 'Paket sipariş', text: 'Paket sipariş düğmeleri online sipariş açıkken görünür. Ayarlar → Online sipariş sayfasından değişir.', links: [{ label: 'Online sipariş ayarları', to: ADMIN_PATHS.onlineOrdering }] },
    tables: { hover: "Masalar'da değişir", title: 'Bölümler ve masalar', text: 'Bölüm adları ve masa sayıları Masalar sayfasından değişir. Bölümün fotoğrafı ve açıklaması burada, kartın üstünde değişir.', links: [{ label: 'Masalar', to: ADMIN_PATHS.tables }] },
    messages: { hover: "Mesajlar Şikayet ve Öneriler'e gelir", title: 'İletişim formu', text: 'Formdan gelen mesajlar Şikayet ve Öneriler sayfasında toplanır. Formun kendisi her sitede aynıdır.', links: [{ label: 'Şikayet ve Öneriler', to: ADMIN_PATHS.messages }] },
    auto: { hover: 'Otomatik hesaplanır', title: 'Otomatik hesaplanır', text: 'Bu satır menüdeki ürünlerden, masalardan ve çalışma saatlerinden kendiliğinden hesaplanır.', links: [{ label: 'Yemeklerimiz', to: ADMIN_PATHS.menu }, { label: 'Masalar', to: ADMIN_PATHS.tables }] },
    eyebrow: { hover: 'Otomatik oluşur', title: 'Kapaktaki üst satır', text: 'Kuruluş yılından ve ilçeden oluşur.', links: [{ label: 'Yemeklerimiz', to: ADMIN_PATHS.menu }, { label: 'Ayarlar', to: ADMIN_PATHS.restaurant }], edit: { label: 'Kuruluş yılını değiştir', target: 'year' } },
    heroActions: { hover: 'Ayarlara göre çıkar', title: 'Kapak düğmeleri', text: '“Sipariş ver” online sipariş açıkken, “Masa ayırt” rezervasyon açıkken görünür; ikisinden biri yoksa yerine “Menüyü gör” gelir.', links: [{ label: 'Rezervasyon ayarları', to: ADMIN_PATHS.reservationRules }, { label: 'Online sipariş ayarları', to: ADMIN_PATHS.onlineOrdering }] },
    actions: { hover: 'Ayarlara göre çıkar', title: 'Hızlı eylemler', text: '“Ara” ve “Yol tarifi” telefondan ve adresten (Ayarlar), “Masa ayırt” rezervasyon ayarından, “WhatsApp” buradaki WhatsApp numarasından gelir.', links: [{ label: 'Ayarlar', to: ADMIN_PATHS.restaurant }, { label: 'Rezervasyon ayarları', to: ADMIN_PATHS.reservationRules }], edit: { label: 'WhatsApp numarasını değiştir', target: 'contact' } },
    lastCall: { hover: 'Otomatik oluşur', title: '“Acıktınız mı?” kartı', text: 'Her sayfanın sonundaki bu kart saatlerden, ilçeden, telefondan ve sipariş/rezervasyon ayarlarından kendiliğinden oluşur.', links: [{ label: 'Ayarlar', to: ADMIN_PATHS.restaurant }, { label: 'Online sipariş ayarları', to: ADMIN_PATHS.onlineOrdering }], edit: { label: 'Çalışma saatlerini değiştir', target: 'hours' } },
    fixed: { hover: 'Sabit yazı', title: 'Sabit yazı', text: 'Bu yazı ve bağlantılar her restoran sitesinde aynıdır; değiştirilemez.', links: [] },
    reservationText: { hover: 'Sabit yazı', title: 'Rezervasyon sayfası', text: '“Masanızı ayırtın.” başlığı ve açıklaması sabittir. Akışın içeriği (günler, saatler, masalar) rezervasyon ayarlarından ve masalardan gelir.', links: [{ label: 'Rezervasyon ayarları', to: ADMIN_PATHS.reservationRules }, { label: 'Masalar', to: ADMIN_PATHS.tables }] },
};

/**
 * Bir öğeyi sarmalamadan seçilebilir yapar (ızgara hücresi, düğme gibi yerini değiştiremeyen öğeler): düzenleyicide
 * `data-edit-target` ve sakin çerçeve sınıfları; müşteri sitesinde boş. Kullanım:
 * `const t = editTarget(edit, 'photo:founder', 'Usta portresi'); <img {...t} className={cn(base, t.className)} />`.
 */
export function editTarget(edit: SiteEditApi | null, target: SiteEditTarget, label?: string): { 'data-edit-target'?: string; 'data-edit-label'?: string; className: string } {
    if (!edit) return { className: '' };
    const selected = edit.selected === target;
    return {
        'data-edit-target': target,
        'data-edit-label': label,
        className: selected
            ? 'cursor-pointer outline-2 outline-offset-[-2px] outline-[#2B7FFF]'
            : 'cursor-pointer outline-1 outline-offset-[-1px] outline-transparent hover:outline-[#2B7FFF]/60',
    };
}

/**
 * Başka sayfadan gelen bilgiyi sarmalamadan tıklanır yapar (çerçeve yok; üstüne gelince gri "Ayarlar'da değişir"
 * etiketi, tıklanınca kaynak penceresi): `<a {...editExternal(edit, 'restaurant')} className={cn(base, x.className)}>`.
 */
export function editExternal(edit: SiteEditApi | null, source: keyof typeof EXTERNAL_SOURCES): { 'data-edit-external'?: string; className: string } {
    if (!edit) return { className: '' };
    return { 'data-edit-external': source, className: 'cursor-help' };
}

const TARGET_HOVER: Record<string, string> = {
    hours: 'Saatleri değiştir', rating: 'Puanı değiştir', contact: 'Bağlantıyı değiştir', year: 'Yılı değiştir',
    amenities: 'Olanakları seç', 'gallery:add': 'Fotoğraf ekle',
};

/** Üstüne gelince imlecin yanındaki etiket: ne olacağını söyler. `muted`: başka sayfadan gelen bilgi (gri). */
export function hoverLabel(kind: 'text' | 'target' | 'external', value: string): { text: string; muted: boolean } {
    if (kind === 'text') return { text: 'Yazıyı değiştir', muted: false };
    if (kind === 'external') return { text: EXTERNAL_SOURCES[value]?.hover ?? 'Başka sayfada değişir', muted: true };
    if (TARGET_HOVER[value]) return { text: TARGET_HOVER[value], muted: false };
    return { text: 'Fotoğrafı değiştir', muted: false };
}
