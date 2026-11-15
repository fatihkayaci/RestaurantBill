import type { PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { fullAddress, hoursText } from './useSite';

// Restoran sitesinin "Birleşik" görünümünün ortak parçaları: yazı tipleri, sınıf dizileri, hareket CSS'i ve
// hangi sayfanın gösterileceği (restoranın girmediği veri uydurulmaz; boş sayfanın menü bağlantısı gizlenir).

export const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap';
export const serif = "font-[family-name:'Instrument_Serif',serif] font-normal";
export const sans = "font-[family-name:'Inter',system-ui,sans-serif]";
export const eyebrow = 'text-xs font-medium uppercase tracking-[0.28em] text-[#6F6A63]';
export const line = 'border-[#DDD7CE]';
export const footLabel = 'text-xs font-medium uppercase tracking-[0.2em] text-[#6F6A63]';
/** Üstüne gelince soldan sağa çizilen alt çizgi. */
export const underlineLink = 'bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-300 hover:bg-[length:100%_1px] focus-visible:bg-[length:100%_1px] motion-reduce:transition-none';
/** "Devamı →" bağlantıları: alt çizgili, ok üstüne gelince kayar. */
export const moreLink = 'group inline-flex items-center gap-2 self-start border-b border-[#141414] pb-1 text-[13px] font-medium uppercase tracking-[0.16em] text-[#141414]';
export const moreArrow = 'inline-block transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none';

// ── Kart dili (SiteCards.tsx bileşenleriyle birlikte; İletişim'de başladı, diğer alt sayfalar da kullanacak) ──
/** Beyaz, yuvarlak köşeli kart yüzeyi (bilgi kartları). Büyük kartlarda `siteCardLg`. */
export const siteCard = 'rounded-[20px] border border-[#E6E0D6] bg-white text-[#141414]';
/** Büyük kart yüzeyi (form, uzun içerik): daha geniş köşe. */
export const siteCardLg = 'rounded-[20px] border border-[#E6E0D6] bg-white text-[#141414] md:rounded-[24px]';
/** Koyu kart yüzeyi (rezervasyon gibi çağrılar). */
export const siteCardDark = 'rounded-[20px] bg-[#141414] text-white';

/** Kart etiketi: küçük, aralıklı büyük harf. */
export const cardLabel = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6F6A63] md:text-xs md:tracking-[0.2em]';
/** Kartın büyük değeri (telefon, saat, kullanıcı adı): serif. */
export const cardValue = cn(serif, 'text-[26px] leading-none md:text-[32px]');
/** Kart içindeki metin bağlantısı ("Yol tarifi al →", "Menüyü gör →"). */
export const cardLink = 'self-start text-sm font-semibold text-[#141414] underline underline-offset-4 transition-colors hover:text-[var(--site-accent)]';

const buttonBase = 'inline-flex h-11 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full px-[18px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)] focus-visible:ring-offset-2';
/** Kart düğmeleri: `outline` açık kartta ikincil, `dark` haritadaki koyu hap, `accent` vurgu renginde ana eylem. */
export const cardButton = {
    outline: cn(buttonBase, 'border border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white'),
    dark: cn(buttonBase, 'bg-[#141414] text-white hover:bg-[#2A2622]'),
    accent: cn(buttonBase, 'bg-[var(--site-accent)] px-5 font-bold text-[var(--site-on-accent)] hover:opacity-90'),
} as const;

// Kayan şeritler ve dönen rozet; hareket azaltma tercihinde durur.
export const MOTION_CSS = `
@keyframes rb-kay{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes rb-don{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.rb-kay{animation:rb-kay 34s linear infinite}
.rb-kay-yavas{animation:rb-kay 70s linear infinite}
.rb-don{animation:rb-don 18s linear infinite}
@media (prefers-reduced-motion: reduce){.rb-kay,.rb-kay-yavas,.rb-don{animation:none}}
`;

export type SitePageKey = 'home' | 'menu' | 'hakkimizda' | 'mekan' | 'iletisim' | 'rezervasyon' | 'rezervasyon-sorgula';

export function hasAboutPage(site: PublicSite): boolean {
    return Boolean(site.site.storyTitle || site.site.about);
}

export function hasVenuePage(site: PublicSite): boolean {
    const content = site.site;
    return Boolean(content.headline || content.tagline || content.aboutImageUrl);
}

export function hasContactPage(site: PublicSite): boolean {
    return Boolean(fullAddress(site) || site.phone || site.site.instagramUrl || hoursText(site));
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
