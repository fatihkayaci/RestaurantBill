import type { CSSProperties } from 'react';

// Restoran sitesinin "Ocak" görünümü (tasarım: canvas "Restoran Sitesi v2").
// Koyu kömür zemin, köz turuncusu vurgu. Renkler tek yerde CSS değişkeni olarak tanımlı;
// bileşenler yalnızca bu değişkenleri kullanır. Vurgu rengi ileride restoranın kendi ayarından gelecek.

export const SITE_FONTS_HREF =
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap';

export const DEFAULT_ACCENT = '#E8743B';

export function siteRootStyle(accent: string = DEFAULT_ACCENT): CSSProperties {
    return {
        '--site-accent': accent,
        '--site-on-accent': '#15110E',
        '--site-bg': '#15110E',
        '--site-band': '#1B1612',
        '--site-card': '#1F1915',
        '--site-raised': '#241D18',
        '--site-text': '#F5EFE7',
        '--site-sub': '#BDB1A3',
        '--site-muted': '#A39689',
        '--site-border': '#2E2520',
        '--site-border-strong': '#4A3D34',
        '--site-disabled': '#1A1512',
        // Açık kart (rezervasyon özeti gibi vurgulu yüzeyler)
        '--site-paper': '#F5EFE7',
        '--site-on-paper': '#15110E',
        '--site-on-paper-sub': '#5C5047',
        // Durum renkleri (koyu zeminde okunur)
        '--site-ok-bg': '#13261A',
        '--site-ok-line': '#2F6B45',
        '--site-ok': '#5FCB8A',
        '--site-error-bg': '#2A1512',
        '--site-error-line': '#7A3328',
        '--site-error': '#F4B4A8',
        colorScheme: 'dark',
        fontFamily: "Inter, system-ui, sans-serif",
        backgroundColor: 'var(--site-bg)',
        color: 'var(--site-text)',
    } as CSSProperties;
}

/** Başlıklar ve fiyatlar için Bricolage Grotesque. */
export const headingFont = "font-[family-name:'Bricolage_Grotesque',system-ui,sans-serif] tracking-[-0.02em]";

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
