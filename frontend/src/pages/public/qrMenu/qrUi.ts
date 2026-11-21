import { cn } from '@/lib/utils';
import { headingFont } from '../site/siteTheme';

// Masa QR menüsünün (qrMenu/) sınıf dizileri. Renkler yalnız sitenin tema değişkenlerinden (siteTheme.ts → siteRootStyle):
// vurgu (--site-accent) düğmeler, seçili çip ve "+"; kartlar --site-card, sayfa --site-bg. Açık zeminde vurgu rengi yazı
// her zaman --site-accent-text (temanın okunur tonu), vurgu zeminde yazı --site-on-accent.

/** Ortalanmış telefon sütunu: tablette ve masaüstünde de tek sütun. */
export const column = 'mx-auto w-full max-w-[520px]';

/** Klavye odağı: temanın odak rengi, zeminden ayrık halka. */
export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--site-bg)]';

/** Açık kart (ürün kartı, liste satırı, bilgi kutusu). */
export const card = 'rounded-2xl border border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)]';

/** Bölüm başlığı (Popüler / kategori adı). */
export const sectionTitle = 'm-0 text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--site-text)]';

/** Büyük başlık (ürün adı, sepet): tasarımın başlık yazı tipi. */
export const displayTitle = cn(headingFont, 'm-0 leading-[1.05]');

/** Fiyat (kartta). */
export const priceText = 'font-extrabold tabular-nums text-[var(--site-text)]';

/** Çip: seçili vurgu zeminli, seçili değilse kart. */
export function chipClass(active: boolean) {
    return cn('inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors',
        focusRing,
        active ? 'border-[var(--site-accent)] bg-[var(--site-accent)] text-[var(--site-on-accent)]'
            : 'border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-border-strong)]');
}

/** Ana düğme (Sepete ekle, Siparişi gönder). */
export const primaryButton = cn('inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-[var(--site-accent)] px-5 text-base font-extrabold text-[var(--site-on-accent)] shadow-[0_10px_24px_-14px_var(--site-accent)] transition-[opacity,transform] hover:opacity-95 active:scale-[0.99] disabled:opacity-50 motion-reduce:transition-none', focusRing);

/** Çerçeveli ikincil düğme (Siparişlerime git, Menüye dön). */
export const outlineButton = cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-[var(--site-accent)] bg-transparent px-5 text-[15px] font-extrabold text-[var(--site-accent-text)] transition-colors hover:bg-[var(--site-accent-soft)]', focusRing);

/** Yuvarlak simge düğmesi (geri, ara, kapat): 44 px. */
export const iconButton = cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--site-text)] transition-colors hover:bg-[var(--site-alt)]', focusRing);

/** Form alanı. */
export const fieldClass = 'w-full rounded-2xl border border-[var(--site-border-mid)] bg-[var(--site-card)] px-3.5 text-[15px] text-[var(--site-text)] placeholder:text-[var(--site-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-focus)]';

/** Tam ekran katman (ürün ayrıntısı, sepet): sayfanın üstünde, kendi kaydırması. */
export const overlayPage = 'fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-[var(--site-bg)] text-[var(--site-text)] animate-in fade-in slide-in-from-bottom-4 duration-200 motion-reduce:animate-none';
