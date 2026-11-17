import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { fullAddress, hoursText } from './useSite';

// Restoran sitesinin ortak parçaları: yazı tipleri, sınıf dizileri, hareket CSS'i ve hangi sayfanın gösterileceği
// (restoranın girmediği veri uydurulmaz). Bütün renkler temanın CSS değişkenlerinden (siteTheme.ts → siteRootStyle).

export const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap';
export const serif = "font-[family-name:'Instrument_Serif',serif] font-normal";
export const sans = "font-[family-name:'Inter',system-ui,sans-serif]";
export const eyebrow = 'text-xs font-medium uppercase tracking-[0.28em] text-[var(--site-muted)]';
export const line = 'border-[var(--site-line)]';
export const footLabel = 'text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-muted)]';
/** İkincil gövde yazısı. */
export const subText = 'text-[var(--site-sub)]';
/** Üstüne gelince soldan sağa çizilen alt çizgi. */
export const underlineLink = 'bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-300 hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px] motion-reduce:transition-none';
/** "Devamı →" bağlantıları: alt çizgili, ok üstüne gelince kayar. */
export const moreLink = 'group inline-flex items-center gap-2 self-start border-b border-[var(--site-text)] pb-1 text-[13px] font-medium uppercase tracking-[0.16em] text-[var(--site-text)]';
export const moreArrow = 'inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none';

// ── Kart dili (SiteCards.tsx bileşenleriyle birlikte; bütün alt sayfalar ve ana sayfa kullanır) ──
/** Yuvarlak köşeli kart yüzeyi (bilgi kartları). Büyük kartlarda `siteCardLg`. */
export const siteCard = 'rounded-[20px] border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)]';
/** Büyük kart yüzeyi (form, uzun içerik): daha geniş köşe. */
export const siteCardLg = 'rounded-[20px] border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[24px]';
/** Koyu kart yüzeyi (rezervasyon gibi çağrılar). */
export const siteCardDark = 'rounded-[20px] bg-[var(--site-paper)] text-[var(--site-on-paper)]';

/** Kart etiketi: küçük, aralıklı büyük harf. */
export const cardLabel = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--site-muted)] md:text-xs md:tracking-[0.2em]';
/** Kartın büyük değeri (telefon, saat, kullanıcı adı): serif. */
export const cardValue = cn(serif, 'text-[26px] leading-none md:text-[32px]');
/** Kart içindeki metin bağlantısı ("Yol tarifi al →", "Menüyü gör →"). */
export const cardLink = 'self-start text-sm font-semibold text-[var(--site-text)] underline underline-offset-4 transition-colors hover:text-[var(--site-accent-text)]';

const buttonBase = 'inline-flex h-11 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full px-[18px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] focus-visible:ring-offset-2';
/** Kart düğmeleri: `outline` açık kartta ikincil, `dark` haritadaki koyu hap, `accent` vurgu renginde ana eylem, `ghost` koyu kartta ikincil. */
export const cardButton = {
    outline: cn(buttonBase, 'border border-[var(--site-text)] text-[var(--site-text)] hover:bg-[var(--site-text)] hover:text-[var(--site-bg)]'),
    dark: cn(buttonBase, 'bg-[var(--site-paper)] text-[var(--site-on-paper)] hover:opacity-90'),
    accent: cn(buttonBase, 'bg-[var(--site-accent)] px-5 font-bold text-[var(--site-on-accent)] hover:opacity-90'),
    ghost: cn(buttonBase, 'border border-white/40 text-[var(--site-on-paper)] hover:bg-white/10'),
} as const;

/** Koyu kapak üstündeki cam düğme. */
export const glassButton = 'inline-flex h-[52px] items-center justify-center whitespace-nowrap rounded-full border border-white/45 bg-white/15 px-6 text-[15px] font-semibold text-white backdrop-blur-[12px] transition-colors hover:bg-white/25';
/** Koyu kapak üstündeki ana düğme. */
export const heroAccentButton = 'inline-flex h-[52px] items-center justify-center whitespace-nowrap rounded-full bg-[var(--site-accent)] px-7 text-[15px] font-bold text-[var(--site-on-accent)] transition-opacity hover:opacity-90';

// Kayan şeritler ve dönen rozet; hareket azaltma tercihinde durur.
export const MOTION_CSS = `
@keyframes rb-kay{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes rb-don{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.rb-kay{animation:rb-kay 34s linear infinite}
.rb-kay-yavas{animation:rb-kay 70s linear infinite}
.rb-don{animation:rb-don 18s linear infinite}
@media (prefers-reduced-motion: reduce){.rb-kay,.rb-kay-yavas,.rb-don{animation:none}}
`;

/** `siparis`: paket sipariş akışı (/siparis ve sipariş takibi); menü listesinde değil, başlığın "Paket sipariş" düğmesi. */
export type SitePageKey = 'home' | 'menu' | 'hakkimizda' | 'mekan' | 'iletisim' | 'rezervasyon' | 'rezervasyon-sorgula' | 'siparis';

export function productCount(site: PublicSite): number {
    return site.categories.reduce((sum, c) => sum + c.products.length, 0);
}

/**
 * Hakkımızda her zaman gösterilebilir: yazı yoksa "Bizi menümüzden tanıyın" (menüden tanıtım), usta bilgisi varsa
 * usta kartı. Yalnız hiçbir şey yoksa (yazı, usta, ürün) bağlantı gizlenir.
 */
export function hasAboutPage(site: PublicSite): boolean {
    const c = site.site;
    return Boolean(c.storyTitle || c.about || c.founderName || productCount(site) > 0);
}

/** Mekân: fotoğraf, başlık, olanak, nasıl gelinir ya da masalı bölüm varsa; fotoğraf yoksa harita ve sözle anlatılır. */
export function hasVenuePage(site: PublicSite): boolean {
    const c = site.site;
    return Boolean(c.headline || c.tagline || c.aboutImageUrl || c.galleryImageUrls.length > 0
        || c.amenities.length > 0 || c.directionsNote || site.regions.length > 0);
}

export function hasContactPage(site: PublicSite): boolean {
    return Boolean(fullAddress(site) || site.phone || site.site.instagramUrl || site.site.whatsappPhone || hoursText(site));
}

export interface SiteNavItem {
    key: SitePageKey;
    to: string;
    label: string;
}

/** Üst ve alt menüdeki sayfalar; içeriği olmayan sayfa listede yer almaz. */
export function siteNav(site: PublicSite): SiteNavItem[] {
    return [
        { key: 'menu' as const, to: '/menu', label: 'Menü', show: true },
        { key: 'hakkimizda' as const, to: '/hakkimizda', label: 'Hakkımızda', show: hasAboutPage(site) },
        { key: 'mekan' as const, to: '/mekan', label: 'Mekân', show: hasVenuePage(site) },
        { key: 'iletisim' as const, to: '/iletisim', label: 'İletişim', show: hasContactPage(site) },
    ].filter(item => item.show).map(({ key, to, label }) => ({ key, to, label }));
}

export const RESERVATION_PATH = '/rezervasyon';

/** Ana sayfadaki hızlı seçiciden gelinirse rezervasyon sayfasının başlangıç seçimi (?tarih&saat&kisi). */
export function reservationHref(choice?: { date: string; time: string; partySize: number }): string {
    if (!choice) return RESERVATION_PATH;
    const params = new URLSearchParams({ tarih: choice.date, saat: choice.time, kisi: String(choice.partySize) });
    return `${RESERVATION_PATH}?${params.toString()}`;
}

export function instagramHandle(url: string): string {
    const handle = url.replace(/\/+$/, '').split('/').pop();
    return handle ? `@${handle}` : 'Instagram';
}

/** Sitenin olanak listesi (admin'de seçilir; backend SiteContent.AmenityKeys ile aynı sıra). */
export const SITE_AMENITIES: { key: string; label: string }[] = [
    { key: 'avlu', label: 'Avlu / bahçe' },
    { key: 'teras', label: 'Teras' },
    { key: 'otopark', label: 'Otopark' },
    { key: 'vale', label: 'Vale' },
    { key: 'cocuk', label: 'Çocuk dostu' },
    { key: 'wifi', label: 'Ücretsiz Wi-Fi' },
    { key: 'engelli', label: 'Engelli erişimi' },
    { key: 'evcil', label: 'Evcil hayvan dostu' },
    { key: 'canli-muzik', label: 'Canlı müzik' },
    { key: 'vejetaryen', label: 'Vejetaryen seçenek' },
    { key: 'kartla-odeme', label: 'Kartla ödeme' },
];

export function amenityLabel(key: string): string | null {
    return SITE_AMENITIES.find(a => a.key === key)?.label ?? null;
}

/**
 * "1987'den beri": Türkçe ayrılma eki sayının okunuşunun son sözcüğüne göre (yedi → 'den, dokuz → 'dan, dört → 'ten,
 * altmış → 'tan; yüz ve bin → 'den).
 */
export function sinceYear(year: number): string {
    const ones = ['', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
    const tens = ['', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
    const suffix = year % 10 !== 0 ? ones[year % 10] : year % 100 !== 0 ? tens[(year % 100) / 10] : 'den';
    return `${year}'${suffix} beri`;
}

/** 4.7 → "4,7" */
export function formatRating(value: number): string {
    return value.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** 12 sütunlu ızgarada genişlik sınıfları (lg). Tailwind sınıfları sabit yazılmalı. */
export const LG_SPAN: Record<number, string> = {
    3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6',
    7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9', 12: 'lg:col-span-12',
};

/**
 * Bento yerleşimi: istenen genişlikleri (12'lik) satırlara dizer; satırı dolduramayan son kart kalan genişliği alır.
 * Böylece az veride boşluk değil, daha az ama daha geniş kart görünür.
 */
export function packRow<T extends { span: number }>(items: T[]): (T & { width: number })[] {
    const out: (T & { width: number })[] = [];
    let row: (T & { width: number })[] = [];
    let used = 0;
    const close = () => {
        if (row.length === 0) return;
        const last = row[row.length - 1];
        last.width += 12 - used;
        out.push(...row);
        row = [];
        used = 0;
    };
    for (const item of items) {
        const span = Math.min(12, item.span);
        if (used + span > 12) close();
        row.push({ ...item, width: span });
        used += span;
        if (used === 12) close();
    }
    close();
    return out;
}
