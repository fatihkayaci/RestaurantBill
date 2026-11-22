import { cn } from '@/lib/utils';

// Masa QR sayfasının "IBAN ile öde" penceresinin (components/IbanPaySheet) sınıf dizileri. Masa menüsünün kendisi
// qrMenu/qrUi.ts'i kullanır. Renkler yalnız temanın CSS değişkenlerinden (siteTheme.ts → siteRootStyle).

/** Açık zeminde küçük üst satır (vurgu yazısı renginde). */
export const eyebrowAccent = 'text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--site-accent-text)]';

/** Ana düğmeler (hap). */
const pillBase = 'inline-flex items-center justify-center gap-2 rounded-full font-extrabold no-underline transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-text)] focus-visible:ring-offset-2';
export const pillDark = cn(pillBase, 'h-14 bg-[var(--site-paper)] px-6 text-base text-[var(--site-on-paper)]');
export const pillAccent = cn(pillBase, 'h-14 bg-[var(--site-accent)] px-6 text-base text-[var(--site-on-accent)]');

/** Alttan açılan pencerenin paneli (krem, yuvarlak üst köşe; geniş ekranda ortada kart). */
export const sheetPanel = 'flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--site-card)] text-[var(--site-text)] outline-none animate-in slide-in-from-bottom duration-200 sm:max-w-lg sm:rounded-[28px]';
export const sheetBackdrop = 'fixed inset-0 z-40 flex flex-col justify-end bg-[rgba(36,24,15,0.6)] sm:items-center sm:justify-center sm:p-4';

/** Pencere başlığındaki yuvarlak kapat düğmesi. */
export const closeCircle = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--site-border-mid)] text-[var(--site-text)] transition-colors hover:border-[var(--site-text)]';
