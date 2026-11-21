import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { RESERVATION_PATH, serif } from '../../siteParts';

// Sophra tasarımının ortak sınıfları. Renkler yalnız --site-* değişkenlerinden (siteTheme.ts): koyu bantlar (üst menü,
// kapak perdesi, alt bilgi) `--site-paper` / `--site-hero-*` / `--site-footer-*`, açık yüzeyler `--site-bg|alt|card`.

/** Bölümlerin genişliği ve kenar boşluğu (telefonda 16 px). */
export const spWrap = 'mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8';

/** Bölüm başlığı (serif, büyük). */
export const spTitle = cn(serif, 'm-0 text-balance text-[34px] leading-[1.05] sm:text-[42px] lg:text-[48px]');

/** Bölümün küçük üst satırı (yalnız bölümün ne olduğunu söylediği yerlerde). */
export const spEyebrow = 'm-0 text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--site-accent-text)]';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)]';
const base = cn('inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[15px] font-bold no-underline transition-[background-color,border-color,opacity] duration-200', focus);

export const spButton = {
    /** Ana eylem: temanın düğme rengi. */
    accent: cn(base, 'bg-[var(--site-accent)] text-[var(--site-on-accent)] hover:opacity-90'),
    /** Açık zeminde ikincil (çizgili). */
    outline: cn(base, 'border border-[var(--site-border-strong)] text-[var(--site-text)] hover:border-[var(--site-text)]'),
    /** Koyu zeminde (kapak) ikincil: açık dolgu, koyu yazı. */
    light: cn(base, 'bg-[var(--site-on-paper)] text-[var(--site-paper)] hover:opacity-90'),
    /** Koyu zeminde çizgili. */
    ghost: cn(base, 'border border-[var(--site-paper-line-strong)] text-[var(--site-on-paper)] hover:bg-[color-mix(in_srgb,var(--site-on-paper)_10%,transparent)]'),
} as const;

/** "Tüm menüye git" gibi metin bağlantısı (ok simgesi ayrı). */
export const spLink = cn('group inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-bold text-[var(--site-accent-text)] no-underline underline-offset-4 hover:underline', focus);

/** Kart yüzeyi: beyaz kart, ince çizgi, yumuşak gölge (tasarımın tek gölgesi). */
export const spCard = 'rounded-[20px] border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] shadow-[0_18px_40px_-28px_color-mix(in_srgb,var(--site-text)_45%,transparent)]';

/** Yatay kaydırılan şerit (telefonda kartlar; kaydırma çubuğu gizli, kenara yapışır). */
export const spRail = '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden';

// Kapak kaydırıcısının geçişi (hareket azaltma tercihinde anında).
export const SOPHRA_CSS = `
.sp-slide{transition:opacity .9s ease}
@media (prefers-reduced-motion: reduce){.sp-slide{transition:none}}
`;

/** Üst menünün ana düğmesi: rezervasyon açıksa "Rezervasyon", değilse Menü'ye "Menüyü incele". */
export function primaryAction(site: PublicSite): { label: string; to: string; reserve: boolean } {
    if (canReserveOnline(site)) return { label: 'Rezervasyon', to: RESERVATION_PATH, reserve: true };
    return { label: 'Menüyü incele', to: '/menu', reserve: false };
}
