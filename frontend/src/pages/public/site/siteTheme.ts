import type { CSSProperties } from 'react';

// Restoranın müşteri sitesinin görünümü (tasarım: "Renkli ve sıcak"). Renkler tek yerde CSS değişkeni olarak tanımlı;
// site sayfaları, rezervasyon akışı, masa QR sayfası ve paket sipariş sayfaları bu değişkenleri kullanır.
// Zemin her temada aynı sıcak kum (#EFE2CC), kutular krem (#FBF4E8), yazı koyu kahve (#24180F). Admin "Restoran sitesi"
// ayarında seçilen tema VURGU rengini (düğme, + düğmesi, vurgu yazısı) ve ana sayfa kapağının ZEMİN rengini belirler;
// boş tema = tasarımın kiremit kapağı ve turuncu vurgusu. İsterse vurgu rengini ayrıca değiştirir (accentColor): düğme
// yazısı ve açık zemindeki vurgu yazısı okunurluk (WCAG AA, 4.5:1) için otomatik ayarlanır.

export const SITE_FONTS_HREF =
    'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500..900;1,9..144,500..900&family=Manrope:wght@400;500;600;700;800&display=swap';

export interface SiteThemePreset {
    key: string;
    label: string;
    /** Admin'deki tek satırlık tarif. */
    description: string;
    /** Sayfa zemini (her temada aynı) */
    bg: string;
    /** Kutu yüzeyi */
    card: string;
    border: string;
    text: string;
    muted: string;
    /** Düğme zemini (yazısı onAccent) */
    accent: string;
    onAccent: string;
    /** Açık zeminde vurgu yazısı (italik başlık parçası, etiket, rozet); #EFE2CC ve #FBF4E8 üstünde en az 4.5:1 */
    accentText: string;
    /** Ana sayfa kapağının zemini ve alt şeridi (üstünde krem yazı ve açık hardal vurgu, en az 4.5:1). */
    hero: string;
    heroDeep: string;
    /** Ana sayfadaki menü kutusunun zemini (kapakla aynı renk olmasın diye). */
    menuBox: string;
}

/** "Renkli ve sıcak" paleti (bütün temalarda ortak). */
export const SITE_PALETTE = {
    bg: '#EFE2CC',
    fg: '#24180F',
    alt: '#F3E7D3',
    card: '#FBF4E8',
    text2: '#5A4A3C',
    muted: '#6B5B4C',
    wordmark: '#E3D2B6',
    placeholder: '#E6D5B8',
    rgb: '36,24,15',
    heroOverlay: 'rgba(251,244,232,0.82)',
    mustard: '#EBB03F',
    /** Koyu zeminlerde (kapak, hikâye) hardal yazı: #EBB03F'nin biraz açığı, koyu kiremit üstünde de 4.5:1. */
    mustardText: '#F2C25E',
    terracotta: '#A9401F',
    olive: '#3E4A33',
    story: '#6E2A15',
    // Koyu panel (sepet, çağrı kartı)
    paper: '#24180F',
    onPaper: '#FBF4E8',
    onPaperSub: '#CBBFAE',
} as const;

const P = SITE_PALETTE;
const INK = P.fg;
const base = { bg: P.bg, card: P.card, border: `rgba(${P.rgb},0.12)`, text: P.fg, muted: P.muted };
/** Turuncu vurgu (tasarımın #D9562B'si koyu yazıyla 4.38:1 kaldığı için bir tık açık). */
const ORANGE = { accent: '#DC5B2F', onAccent: INK, accentText: '#A9401F' };
/** Hardal vurgu. */
const MUSTARD = { accent: P.mustard, onAccent: INK, accentText: '#7A5208' };

export const SITE_THEMES: Record<string, SiteThemePreset> = {
    altin: {
        key: 'altin', label: 'Kiremit', description: 'Kiremit kapak, turuncu vurgu. Varsayılan.', ...base, ...ORANGE,
        hero: '#8C3317', heroDeep: '#722A12', menuBox: P.olive,
    },
    terracotta: {
        key: 'terracotta', label: 'Kiremit · hardal', description: 'Kiremit kapak, hardal vurgu. Ocakbaşı, ızgara.', ...base, ...MUSTARD,
        hero: '#8C3317', heroDeep: '#722A12', menuBox: P.olive,
    },
    zeytin: {
        key: 'zeytin', label: 'Zeytin', description: 'Zeytin yeşili kapak, turuncu vurgu. Ege, meyhane, kahvaltı.', ...base, ...ORANGE,
        hero: P.olive, heroDeep: '#2F3926', menuBox: '#8C3317',
    },
    lacivert: {
        key: 'lacivert', label: 'Lacivert', description: 'Gece mavisi kapak, hardal vurgu. Balık, deniz kenarı.', ...base, ...MUSTARD,
        hero: '#1F3550', heroDeep: '#172839', menuBox: P.olive,
    },
    bordo: {
        key: 'bordo', label: 'Bordo', description: 'Şarap rengi kapak, hardal vurgu. Akşam yemeği, steakhouse.', ...base, ...MUSTARD,
        hero: '#7A2232', heroDeep: '#5E1A27', menuBox: P.olive,
    },
    komur: {
        key: 'komur', label: 'Kömür', description: 'Koyu kahve kapak, hardal vurgu. Bar, gece mekânı.', ...base, ...MUSTARD,
        hero: P.fg, heroDeep: '#17100A', menuBox: P.olive,
    },
    beyaz: {
        key: 'beyaz', label: 'Toprak', description: 'Toprak rengi kapak, turuncu vurgu. Sade ve sıcak.', ...base, ...ORANGE,
        hero: '#4A3C30', heroDeep: '#3A2F25', menuBox: P.olive,
    },
};

/** Boş tema anahtarı bu temayı verir (backend'de anahtarı yok; admin'de seçilince "" kaydedilir). */
export const DEFAULT_THEME = 'altin';
export const SITE_THEME_KEYS = Object.keys(SITE_THEMES);

/** Varsayılan temanın vurgu rengi (admin'de "tema rengi" seçeneği). */
export const DEFAULT_ACCENT = SITE_THEMES[DEFAULT_THEME].accent;

export function resolveTheme(key?: string | null): SiteThemePreset {
    return (key && SITE_THEMES[key]) || SITE_THEMES[DEFAULT_THEME];
}

/** Koyu bant ve panellerin zemini (sepet paneli, akış sayfalarının kapağı). */
export const SITE_INK = P.paper;

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
    for (let i = 0; i < 30 && contrastRatio(current, bg) < min; i++) {
        const [r, g, b] = rgb(current);
        current = towardsWhite
            ? toHex([r + (255 - r) * 0.12, g + (255 - g) * 0.12, b + (255 - b) * 0.12])
            : toHex([r * 0.88, g * 0.88, b * 0.88]);
    }
    return current;
}

/** Düğme zemini ve yazısı: koyu ya da beyaz yazıdan okunanı; ikisi de yetmiyorsa zemin koyulaştırılır. */
function accentPair(accent: string): { accent: string; onAccent: string } {
    const dark = contrastRatio(INK, accent);
    const white = contrastRatio('#FFFFFF', accent);
    if (dark >= 4.5 && dark >= white) return { accent, onAccent: INK };
    if (white >= 4.5) return { accent, onAccent: '#FFFFFF' };
    if (dark >= 4.5) return { accent, onAccent: INK };
    return { accent: ensureContrast(accent, '#FFFFFF'), onAccent: '#FFFFFF' };
}

/**
 * Sitenin kök stili. `theme`: hazır tema anahtarı (boş/bilinmeyen = kiremit). `accentColor`: restoranın özel vurgu
 * rengi (boşsa temanınki). Parametresiz çağrı varsayılan temayı verir.
 */
export function siteRootStyle(accentColor?: string | null, theme?: string | null): CSSProperties {
    const t = resolveTheme(theme);
    const custom = isHex(accentColor) && accentColor.toUpperCase() !== t.accent.toUpperCase();
    const pair = custom ? accentPair(accentColor) : { accent: t.accent, onAccent: t.onAccent };
    // Vurgu yazısı hem kum zeminde hem krem kutularda okunmalı (kum daha koyu: ona göre).
    const accentText = custom ? ensureContrast(accentColor, P.bg) : t.accentText;
    // Koyu panelde (sepet, çağrı kartı) vurgu: koyu vurgular açılır.
    const onDark = ensureContrast(pair.accent, P.paper);
    const line = (a: number) => `rgba(${P.rgb},${a})`;
    return {
        '--site-accent': pair.accent,
        '--site-on-accent': pair.onAccent,
        '--site-accent-text': accentText,
        '--site-accent-bright': onDark,
        '--site-accent-on-dark': onDark,
        '--site-accent-line': `${pair.accent}AA`,
        '--site-accent-soft': `color-mix(in srgb, ${pair.accent} 22%, ${P.card})`,
        '--site-hero-bg': t.hero,
        '--site-hero-deep': t.heroDeep,
        '--site-menu-box': t.menuBox,
        '--site-story': P.story,
        '--site-mustard': P.mustard,
        '--site-mustard-text': P.mustardText,
        '--site-ink': P.paper,
        '--site-hero': P.paper,
        '--site-overlay': P.heroOverlay,
        '--site-bg': P.bg,
        '--site-alt': P.alt,
        '--site-band': P.alt,
        '--site-card': P.card,
        '--site-raised': P.alt,
        '--site-placeholder': P.placeholder,
        '--site-chip': P.alt,
        '--site-text': P.fg,
        '--site-sub': P.text2,
        '--site-muted': P.muted,
        '--site-wordmark': P.wordmark,
        '--site-border': line(0.12),
        '--site-line': line(0.1),
        '--site-border-mid': line(0.2),
        '--site-border-strong': line(0.3),
        '--site-disabled': '#A08F7C',
        '--site-paper': P.paper,
        '--site-on-paper': P.onPaper,
        '--site-on-paper-sub': P.onPaperSub,
        '--site-paper-line': 'rgba(251,244,232,0.14)',
        '--site-paper-line-strong': 'rgba(251,244,232,0.28)',
        '--site-ok-bg': '#E3F1E6',
        '--site-ok-line': '#9CCBA9',
        '--site-ok': '#1B6A43',
        '--site-error-bg': '#FDECE7',
        '--site-error-line': '#F0B4A3',
        '--site-error': '#A3301A',
        colorScheme: 'light',
        fontFamily: 'Manrope, system-ui, sans-serif',
        backgroundColor: 'var(--site-bg)',
        color: 'var(--site-text)',
    } as CSSProperties;
}

/** Başlıklar ve büyük fiyatlar: Fraunces (kalın, sıkı aralık). */
export const headingFont = "font-[family-name:Fraunces,Georgia,serif] font-bold! tracking-[-0.02em]";

/** Başlığı iki parçaya böler: ikinci parça italik vurgu yazısıyla yazılır (Tema 2 başlık dili).
 *  "Közün başında, ustanın elinden." → ["Közün başında,", "ustanın elinden."]; virgül yoksa son kelime vurgulanır. */
export function splitAccent(text: string): [string, string] {
    const value = text.trim();
    const comma = value.indexOf(', ');
    if (comma > 0 && comma < value.length - 2) return [value.slice(0, comma + 1), value.slice(comma + 2)];
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length < 2) return ['', value];
    return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

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
export const container = 'mx-auto w-full max-w-[1320px] px-4 md:px-8';
export const pill = 'inline-flex items-center justify-center rounded-full font-bold no-underline transition-opacity hover:opacity-90';
