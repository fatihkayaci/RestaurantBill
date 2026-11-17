import type { CSSProperties } from 'react';

// Restoranın müşteri sitesinin görünümü. Renkler tek yerde CSS değişkeni olarak tanımlı; site sayfaları, rezervasyon
// akışı, masa QR sayfası ve paket sipariş sayfaları bu değişkenleri kullanır.
// Varsayılan tema sıcak "Terracotta / krem": krem zemin (#F6F1EA), koyu sıcak yazı (#1D1A16), terracotta vurgu.
// Admin "Restoran sitesi" ayarından 6 hazır temadan birini seçer; isterse vurgu rengini ayrıca değiştirir (accentColor).
// Özel vurgu renginde düğme yazısı ve açık zemindeki vurgu yazısı okunurluk (WCAG AA) için otomatik ayarlanır.

export const SITE_FONTS_HREF =
    'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap';

export interface SiteThemePreset {
    key: string;
    label: string;
    /** Admin'deki tek satırlık tarif. */
    description: string;
    dark: boolean;
    /** Sayfa zemini */
    bg: string;
    /** Kart yüzeyi */
    card: string;
    /** Hafif yükseltilmiş zemin (sayaç, iskelet, şerit) */
    raised: string;
    /** Fotoğrafsız görsel yuvası, bej panel */
    placeholder: string;
    text: string;
    sub: string;
    muted: string;
    border: string;
    /** Bölüm ayırıcı ince çizgi */
    line: string;
    borderStrong: string;
    /** Fotoğrafsız kapağın koyu zemini */
    hero: string;
    /** Koyu çağrı kartı (rezervasyon, son çağrı) */
    paper: string;
    onPaper: string;
    onPaperSub: string;
    /** Düğme zemini (yazısı onAccent) */
    accent: string;
    onAccent: string;
    /** Açık zeminde vurgu yazısı (bağlantı, rozet) */
    accentText: string;
    /** Koyu zemindeki süs (✦, nokta) */
    accentBright: string;
    /** Hazırlık süresi rozeti gibi küçük çiplerin zemini */
    chip: string;
    okBg: string;
    ok: string;
    errorBg: string;
    error: string;
}

const LIGHT_STATUS = { okBg: '#E3F1E6', ok: '#1B6A43', errorBg: '#FDECE7', error: '#A3301A' };

export const SITE_THEMES: Record<string, SiteThemePreset> = {
    terracotta: {
        key: 'terracotta', label: 'Terracotta', description: 'Krem zemin, sıcak koyu yazı, kiremit vurgu. Varsayılan.', dark: false,
        bg: '#F6F1EA', card: '#FFFCF7', raised: '#EFEAE3', placeholder: '#EDE6DC', text: '#1D1A16', sub: '#5E5850', muted: '#6F6A63',
        border: '#E6DED3', line: '#DDD5C9', borderStrong: '#CFC6B8', hero: '#2A2622', paper: '#1D1A16', onPaper: '#FFFFFF', onPaperSub: '#C9C1B6',
        accent: '#B4532F', onAccent: '#FFFFFF', accentText: '#A0452A', accentBright: '#F08A5D', chip: '#F1EAE0', ...LIGHT_STATUS,
    },
    zeytin: {
        key: 'zeytin', label: 'Zeytin', description: 'Açık keten zemin, zeytin yeşili vurgu. Ege, meyhane, kahvaltı.', dark: false,
        bg: '#F3F1E8', card: '#FFFEF8', raised: '#EAE8DC', placeholder: '#E6E3D4', text: '#1E2118', sub: '#56594A', muted: '#666A58',
        border: '#DFDDCC', line: '#D6D3C0', borderStrong: '#C6C3AE', hero: '#24271D', paper: '#1E2118', onPaper: '#FFFFFF', onPaperSub: '#C4C6B4',
        accent: '#55652B', onAccent: '#FFFFFF', accentText: '#4D5C27', accentBright: '#B9C77A', chip: '#ECEADD', ...LIGHT_STATUS,
    },
    lacivert: {
        key: 'lacivert', label: 'Lacivert', description: 'Serin açık zemin, lacivert vurgu. Balık, deniz kenarı.', dark: false,
        bg: '#F1F3F7', card: '#FFFFFF', raised: '#E7EAF0', placeholder: '#E2E6EE', text: '#131A2C', sub: '#505971', muted: '#5F6880',
        border: '#DCE0E8', line: '#D2D7E1', borderStrong: '#C1C7D4', hero: '#151C2E', paper: '#131A2C', onPaper: '#FFFFFF', onPaperSub: '#BAC1D1',
        accent: '#1F3A8A', onAccent: '#FFFFFF', accentText: '#1F3A8A', accentBright: '#8FA8F0', chip: '#E9ECF3', ...LIGHT_STATUS,
    },
    bordo: {
        key: 'bordo', label: 'Bordo', description: 'Pembemsi krem zemin, şarap rengi vurgu. Akşam yemeği, steakhouse.', dark: false,
        bg: '#F7F0EE', card: '#FFFBFA', raised: '#EFE5E2', placeholder: '#EBDFDB', text: '#241415', sub: '#654F4E', muted: '#75605F',
        border: '#E8D9D6', line: '#DFCDC9', borderStrong: '#D0BAB5', hero: '#2A1618', paper: '#241415', onPaper: '#FFFFFF', onPaperSub: '#D2BFBC',
        accent: '#8E2433', onAccent: '#FFFFFF', accentText: '#8E2433', accentBright: '#E58A96', chip: '#F1E6E3', ...LIGHT_STATUS,
    },
    komur: {
        key: 'komur', label: 'Kömür', description: 'Koyu zemin, köz turuncusu vurgu. Ocakbaşı, bar, gece mekânı.', dark: true,
        bg: '#161412', card: '#211E1B', raised: '#2A2622', placeholder: '#2F2A25', text: '#F3EEE7', sub: '#BDB4A8', muted: '#A39A8E',
        border: '#3A342E', line: '#342F29', borderStrong: '#4A433B', hero: '#0E0C0B', paper: '#2E2621', onPaper: '#F3EEE7', onPaperSub: '#BDB4A8',
        accent: '#F08A5D', onAccent: '#1D1A16', accentText: '#F4A27D', accentBright: '#F08A5D', chip: '#2F2A25',
        okBg: '#1E3A2A', ok: '#8FD9A8', errorBg: '#3D2420', error: '#F4A28C',
    },
    beyaz: {
        key: 'beyaz', label: 'Klasik beyaz', description: 'Beyaz zemin, nötr gri, turuncu vurgu. Sade ve modern.', dark: false,
        bg: '#FFFFFF', card: '#FFFFFF', raised: '#F7F7F5', placeholder: '#F2F2F0', text: '#111111', sub: '#5F5F5F', muted: '#6B6B6B',
        border: '#EAEAEA', line: '#E2E2E2', borderStrong: '#D6D6D6', hero: '#1A1A1A', paper: '#111111', onPaper: '#FFFFFF', onPaperSub: '#BDBDBD',
        accent: '#C2410C', onAccent: '#FFFFFF', accentText: '#C2410C', accentBright: '#FB923C', chip: '#F2F2F0', ...LIGHT_STATUS,
    },
};

export const DEFAULT_THEME = 'terracotta';
export const SITE_THEME_KEYS = Object.keys(SITE_THEMES);

/** Varsayılan temanın vurgu rengi (admin'de "tema rengi" seçeneği). */
export const DEFAULT_ACCENT = SITE_THEMES[DEFAULT_THEME].accent;

export function resolveTheme(key?: string | null): SiteThemePreset {
    return (key && SITE_THEMES[key]) || SITE_THEMES[DEFAULT_THEME];
}

/** Fotoğrafsız kapak ve alt bilginin koyu zemini (varsayılan tema). */
export const SITE_INK = SITE_THEMES[DEFAULT_THEME].hero;

// ── Renk hesapları (özel vurgu rengi için) ───────────────────────────────────────────────────────
function isHex(value: string | undefined | null): value is string {
    return !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function rgb(hex: string): [number, number, number] {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
    return `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function luminance(hex: string): number {
    const [r, g, b] = rgb(hex).map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Renk `bg` üstünde en az `min` karşıtlığa ulaşana kadar koyulaşır (koyu zeminde açılır). */
export function ensureContrast(color: string, bg: string, min = 4.5): string {
    let current = color;
    const towardsWhite = luminance(bg) < 0.2;
    for (let i = 0; i < 20 && contrastRatio(current, bg) < min; i++) {
        const [r, g, b] = rgb(current);
        current = towardsWhite
            ? toHex([r + (255 - r) * 0.12, g + (255 - g) * 0.12, b + (255 - b) * 0.12])
            : toHex([r * 0.88, g * 0.88, b * 0.88]);
    }
    return current;
}

/** Düğme zemini ve yazısı: beyaz ya da koyu yazıdan okunanı; ikisi de yetmiyorsa zemin koyulaştırılır. */
function accentPair(accent: string, darkText: string): { accent: string; onAccent: string } {
    const white = contrastRatio('#FFFFFF', accent);
    const dark = contrastRatio(darkText, accent);
    if (white >= 4.5) return { accent, onAccent: '#FFFFFF' };
    if (dark >= 4.5) return { accent, onAccent: darkText };
    return { accent: ensureContrast(accent, '#FFFFFF'), onAccent: '#FFFFFF' };
}

/**
 * Sitenin kök stili. `theme`: hazır tema anahtarı (boş/bilinmeyen = terracotta). `accentColor`: restoranın özel vurgu
 * rengi (boşsa temanınki). Parametresiz çağrı varsayılan sıcak temayı verir.
 */
export function siteRootStyle(accentColor?: string | null, theme?: string | null): CSSProperties {
    const t = resolveTheme(theme);
    const custom = isHex(accentColor) && accentColor.toUpperCase() !== t.accent.toUpperCase();
    const pair = custom ? accentPair(accentColor, '#1D1A16') : { accent: t.accent, onAccent: t.onAccent };
    const accentText = custom ? ensureContrast(accentColor, t.card) : t.accentText;
    const accentBright = custom ? accentColor : t.accentBright;
    return {
        '--site-accent': pair.accent,
        '--site-on-accent': pair.onAccent,
        '--site-accent-text': accentText,
        '--site-accent-bright': accentBright,
        '--site-accent-soft': `color-mix(in srgb, ${accentText} 14%, ${t.card})`,
        '--site-ink': t.hero,
        '--site-hero': t.hero,
        '--site-bg': t.bg,
        '--site-band': t.card,
        '--site-card': t.card,
        '--site-raised': t.raised,
        '--site-placeholder': t.placeholder,
        '--site-chip': t.chip,
        '--site-text': t.text,
        '--site-sub': t.sub,
        '--site-muted': t.muted,
        '--site-border': t.border,
        '--site-line': t.line,
        '--site-border-strong': t.borderStrong,
        '--site-disabled': t.dark ? '#6F675D' : '#B0A89C',
        '--site-paper': t.paper,
        '--site-on-paper': t.onPaper,
        '--site-on-paper-sub': t.onPaperSub,
        '--site-ok-bg': t.okBg,
        '--site-ok-line': t.dark ? '#3C6B4F' : '#9CCBA9',
        '--site-ok': t.ok,
        '--site-error-bg': t.errorBg,
        '--site-error-line': t.dark ? '#7A3C30' : '#F0B4A3',
        '--site-error': t.error,
        colorScheme: t.dark ? 'dark' : 'light',
        fontFamily: "'Inter Tight', system-ui, sans-serif",
        backgroundColor: 'var(--site-bg)',
        color: 'var(--site-text)',
    } as CSSProperties;
}

/** Başlıklar ve fiyatlar: Inter Tight, sıkı aralık. */
export const headingFont = "font-[family-name:'Inter_Tight',system-ui,sans-serif] tracking-[-0.04em]";

// "Dost Kafe" → "Dost Kafe" (aradaki boşluk vurgu noktasına döner; tek kelimede nokta sona gelir).
export function wordmarkParts(name: string): { first: string; rest: string } {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return { first: words[0] ?? '', rest: words.slice(1).join(' ') };
}

// "Dost Lokanta" → "DL"
export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0).toLocaleUpperCase('tr-TR'))
        .join('');
}

export function telHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** "0532 000 48 48" → https://wa.me/905320004848 (Türkiye numarası varsayılır). */
export function whatsappHref(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10) digits = `90${digits}`;
    return `https://wa.me/${digits}`;
}

// "2026-11-14" → "14 Kasım Cuma"
export function formatDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

export function directionsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// 1250 → "1.250 ₺"
export function formatSitePrice(value: number): string {
    return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
}

// ── Ortak sınıf dizileri (site, menü, alt bilgi) ─────────────────────────────────────────────────
export const glass = 'border border-white/25 bg-white/15 backdrop-blur-[14px]';
export const container = 'mx-auto w-full max-w-[1312px] px-5 md:px-16';
export const pill = 'inline-flex items-center justify-center rounded-full font-bold no-underline transition-opacity hover:opacity-90';
