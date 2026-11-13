import type { CSSProperties } from 'react';

// Restoranın müşteri sitesinin görünümü (tasarım: canvas "Restoran Sitesi v2" · "Kafe sitesi").
// Tek nötr palet + tek vurgu: beyaz / açık gri (#F7F7F5) zemin, #EAEAEA çizgi, #111 yazı, #6B6B6B ikincil yazı,
// koyu bölümler (giriş, alt bilgi) #111. Bölümler renkle değil boşluk ve ince çizgiyle ayrılır.
// Vurgu rengi restoranın "Restoran sitesi" ayarından gelir ve sitede yalnız şuralarda kullanılır: girişteki
// "Menüyü gör", rezervasyondaki "Devam et" ve yazı logosundaki nokta (vurgudan türetilmiş açık ton yok).
// Renkler tek yerde CSS değişkeni olarak tanımlı; site, rezervasyon akışı ve masa QR sayfası bu değişkenleri kullanır.

export const SITE_FONTS_HREF =
    'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap';

export const DEFAULT_ACCENT = '#E2531F';

/** Fotoğrafsız kapak ve alt bilginin koyu zemini. */
export const SITE_INK = '#111111';

function isHex(value: string | undefined | null): value is string {
    return !!value && /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function siteRootStyle(accentColor?: string | null): CSSProperties {
    const accent = isHex(accentColor) ? accentColor : DEFAULT_ACCENT;
    return {
        '--site-accent': accent,
        '--site-on-accent': '#FFFFFF',
        '--site-ink': SITE_INK,
        '--site-bg': '#FFFFFF',
        '--site-band': '#FFFFFF',
        '--site-card': '#FFFFFF',
        // Açık gri zemin (hikâye bandı, sayaç, iskelet)
        '--site-raised': '#F7F7F5',
        // Fotoğrafı olmayan görsel yuvası (logo yer tutucusu)
        '--site-placeholder': '#F2F2F0',
        '--site-text': '#111111',
        '--site-sub': '#6B6B6B',
        '--site-muted': '#6B6B6B',
        '--site-border': '#EAEAEA',
        // Form alanı ve rezervasyon akışı seçeneklerinin çerçevesi: çizgiden bir ton koyu, yine nötr
        '--site-border-strong': '#D6D6D6',
        '--site-disabled': '#B0B0B0',
        // Koyu vurgulu yüzey (rezervasyon özeti, seçili seçenek)
        '--site-paper': '#111111',
        '--site-on-paper': '#FFFFFF',
        '--site-on-paper-sub': '#BDBDBD',
        // Durum renkleri (açık zeminde okunur)
        '--site-ok-bg': '#E3F1E6',
        '--site-ok-line': '#9CCBA9',
        '--site-ok': '#1B6A43',
        '--site-error-bg': '#FDECE7',
        '--site-error-line': '#F0B4A3',
        '--site-error': '#A3301A',
        colorScheme: 'light',
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
