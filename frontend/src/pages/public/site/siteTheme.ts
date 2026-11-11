import type { CSSProperties } from 'react';

// Restoran sitesinin "Sıcak" görünümü (tasarım: canvas "Restoran Sitesi", Yön 1).
// Renkler tek yerde CSS değişkeni olarak tanımlı; bileşenler yalnızca bu değişkenleri kullanır.
// Vurgu rengi ileride restoranın kendi ayarından gelecek; şimdilik varsayılan kiremit.

export const SITE_FONTS_HREF =
    'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Work+Sans:wght@400;500;600&display=swap';

export const DEFAULT_ACCENT = '#C2410C';

export function siteRootStyle(accent: string = DEFAULT_ACCENT): CSSProperties {
    return {
        '--site-accent': accent,
        '--site-on-accent': '#FFFFFF',
        '--site-bg': '#FBF6EE',
        '--site-band': '#F4EADB',
        '--site-card': '#FFFFFF',
        '--site-text': '#2B1B12',
        '--site-sub': '#5C4636',
        '--site-muted': '#6B5240',
        '--site-border': '#E5D6C2',
        '--site-disabled': '#F1EBE1',
        '--site-dark': '#2B1B12',
        '--site-on-dark': '#F3E9DC',
        '--site-on-dark-sub': '#CDBBA6',
        '--site-dark-line': '#5C4636',
        colorScheme: 'light',
        fontFamily: "'Work Sans', system-ui, sans-serif",
        backgroundColor: 'var(--site-bg)',
        color: 'var(--site-text)',
    } as CSSProperties;
}

/** Başlıklar ve fiyatlar için Fraunces. */
export const headingFont = 'font-[family-name:Fraunces,Georgia,serif]';

/**
 * Backend'in henüz vermediği site bilgileri. Alan doluysa ilgili bölüm kendiliğinden görünür,
 * boşsa hiç çizilmez (uydurma içerik ya da yer tutucu yok).
 */
export interface SiteExtras {
    accentColor?: string;
    coverUrl?: string;
    logoUrl?: string;
    slogan?: string;
    about?: string;
    hours?: { day: string; time: string }[];
    gallery?: { url: string; alt: string }[];
    instagramUrl?: string;
    whatsappUrl?: string;
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

// "2026-11-14" → "14 Kasım Cuma"
export function formatDay(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

export function directionsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
