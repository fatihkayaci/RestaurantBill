import { cn } from '@/lib/utils';
import { serif } from '../site/siteParts';

// Masa QR sayfasının (karşılama, masa menüsü, sepet, onaylar) "Renkli ve sıcak" sınıf dizileri. Renkler yalnız temanın
// CSS değişkenlerinden (siteTheme.ts → siteRootStyle): restoranın seçtiği tema burada da geçerli olur.
// Karşıtlık: kapak renginde (--site-hero-bg) bütün yazılar krem; hardal yalnız süs çizgisi ve koyu yazılı hardal düğme.

/** Kum sayfada krem kutu (Renkli: 24 px köşe, geniş ekranda 32). */
export const creamBox = 'rounded-[24px] bg-[var(--site-card)] text-[var(--site-text)] md:rounded-[32px]';

/** Kapak renginde kutu: krem yazı. */
export const heroBox = 'relative overflow-hidden rounded-[24px] bg-[var(--site-hero-bg)] text-[var(--site-on-paper)] md:rounded-[32px]';

/** Kapaktaki damalı desen (menü sayfasının kapağıyla aynı). */
export const heroPattern = 'pointer-events-none absolute inset-0 bg-[repeating-conic-gradient(from_45deg,rgba(251,244,232,0.07)_0_25%,transparent_0_50%)] bg-[length:34px_34px]';

/** Kapaktaki küçük üst satır (krem; önünde hardal çizgi ayrı span). */
export const heroEyebrow = 'inline-flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.24em] text-[var(--site-on-paper)]';

/** Açık zeminde küçük üst satır (vurgu yazısı renginde). */
export const eyebrowAccent = 'text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--site-accent-text)]';

/** Açık zemindeki başlığın italik vurgusu. */
export const accentItalic = 'font-semibold italic text-[var(--site-accent-text)]';

/** Büyük ekran başlığı (Fraunces, kalın). */
export const displayTitle = cn(serif, 'm-0 font-extrabold leading-[0.95] tracking-[-0.025em]');

/** Ana düğmeler (hap). */
const pillBase = 'inline-flex items-center justify-center gap-2 rounded-full font-extrabold no-underline transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-text)] focus-visible:ring-offset-2';
export const pillDark = cn(pillBase, 'h-14 bg-[var(--site-paper)] px-6 text-base text-[var(--site-on-paper)]');
export const pillAccent = cn(pillBase, 'h-14 bg-[var(--site-accent)] px-6 text-base text-[var(--site-on-accent)]');
export const pillMustard = cn(pillBase, 'h-14 bg-[var(--site-mustard)] px-6 text-base text-[var(--site-text)]');
export const pillOutline = cn(pillBase, 'h-12 border-2 border-[var(--site-border-strong)] bg-transparent px-5 text-[15px] font-bold text-[var(--site-text)] hover:border-[var(--site-text)] hover:opacity-100');

/** Alttan açılan pencerenin paneli (krem, yuvarlak üst köşe; geniş ekranda ortada kart). */
export const sheetPanel = 'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--site-card)] text-[var(--site-text)] outline-none animate-in slide-in-from-bottom duration-200 sm:max-w-lg sm:rounded-[28px]';
export const sheetBackdrop = 'fixed inset-0 z-40 flex flex-col justify-end bg-[rgba(36,24,15,0.6)] sm:items-center sm:justify-center sm:p-4';

/** Pencere başlığındaki yuvarlak kapat düğmesi. */
export const closeCircle = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-border-mid)] text-[var(--site-text)] transition-colors hover:border-[var(--site-text)]';

/** Adet seçici (sepet): kum hap, krem "−", koyu "+". */
export const stepperWrap = 'flex shrink-0 items-center gap-1 rounded-full bg-[var(--site-bg)] p-1';
export const stepperMinus = 'flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-card)] text-[var(--site-text)]';
export const stepperPlus = 'flex h-11 w-11 items-center justify-center rounded-full bg-[var(--site-paper)] text-[var(--site-on-paper)]';

/** Form alanı (kum zemin, yuvarlak). */
export const fieldClass = 'w-full rounded-2xl border border-[var(--site-border)] bg-[var(--site-bg)] px-3.5 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-accent)]';
