import type { CSSProperties } from 'react';
import type { PublicProduct, PublicSite } from '@/features/customerSite/types';
import type { OnlineOrdering } from '@/features/delivery/types';
import { cn } from '@/lib/utils';
import { serif } from '../../siteParts';
import { resolveFont } from '../../siteTheme';
import { weekSchedule } from '../../useSite';

// "Esnaf Tabelası" düzeninin ortak sınıfları ve yardımcıları. Dil: dükkân tabelası, elle yazılmış fiyat panosu, çinili
// tezgâh, "Buyurun". Fotoğraf olmadan da dolu görünür. Bütün renkler --site-* değişkenlerinden (tema ve özel vurgu her
// birleşimde çalışsın): tabela = kapak rengi (--site-hero-bg, üstünde --site-on-cover), pano = menü kutusu
// (--site-menu-box), sarı = --site-pop. Vurgu rengi (özel seçilebilir) yalnız krem zeminde kullanılır; tabelanın üstünde
// sarı ve krem durur (özel vurgu tabela rengine çok yakın olsa da düğme kaybolmasın). Desenler siteThemes.css'te (`rb-es-*`).

/** İçerik genişliği: geniş pano. */
export const esWrap = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8';
/** Okuma genişliği. */
export const esNarrow = 'mx-auto w-full max-w-[760px] px-4 sm:px-6';

/** Tabela harfi: başlık yazı tipi (Esnaf'ta dar, kalın, BÜYÜK HARF; siteThemes.css), çok sıkı satır. */
export const esSign = cn(serif, 'm-0 break-words leading-[0.88]');
/** Bölüm başlığı (solda, büyük). */
export const esTitle = cn(serif, 'm-0 break-words text-[40px] leading-[0.92] sm:text-[52px] md:text-[64px]');

const buttonBase = 'inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-md px-6 text-[15px] font-extrabold uppercase tracking-[0.04em] no-underline transition-[filter,background-color,border-color,transform] duration-150 active:translate-y-px';
export const esButton = {
    /** Krem zeminde ana düğme: vurgu rengi (özel vurgu da). */
    accent: cn(buttonBase, 'bg-[var(--site-accent)] text-[var(--site-on-accent)] shadow-[inset_0_-3px_0_rgba(0,0,0,0.22)] hover:brightness-110'),
    /** Tabelanın üstünde ana düğme: sarı. */
    pop: cn(buttonBase, 'bg-[var(--site-pop)] text-[var(--site-on-pop)] shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] hover:brightness-105'),
    /** Krem zeminde kalın çerçeveli düğme. */
    ink: cn(buttonBase, 'border-[3px] border-[var(--site-text)] text-[var(--site-text)] hover:bg-[var(--site-text)] hover:text-[var(--site-bg)]'),
    /** Tabelanın / koyu bandın üstünde çerçeveli düğme (krem). */
    onSign: cn(buttonBase, 'border-[3px] border-[var(--site-on-cover)] text-[var(--site-on-cover)] hover:bg-[var(--site-on-cover)] hover:text-[var(--site-hero-bg)]'),
};

/** Kalın alt çizgili metin bağlantısı. */
export const esLink = 'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-extrabold uppercase tracking-[0.04em] text-[var(--site-text)] underline decoration-[var(--site-accent)] decoration-[3px] underline-offset-[6px] transition-[text-decoration-color] hover:decoration-[var(--site-text)]';

/** Kategori şeridinin sekmesi: köşeli tabela plakası, seçili olan kapak renginde. */
export function esnafTabClass(selected: boolean): string {
    return cn('flex h-11 shrink-0 items-center rounded-md border-2 px-3.5 font-[family-name:var(--site-serif)] text-[17px] leading-none no-underline transition-colors',
        selected ? 'border-[var(--site-hero-bg)] bg-[var(--site-hero-bg)] text-[var(--site-on-cover)]'
            : 'border-[var(--site-text)] bg-[var(--site-card)] text-[var(--site-text)] hover:bg-[var(--site-alt)]');
}

/**
 * Tabeladaki dev adın boyu: kutunun genişliğine (container query, `cqi`) sığsın. Kısa ad tek satır (bütün uzunluk),
 * uzun ad sözcük sözcük kırılır (en uzun sözcük). Harf genişliği seçilen yazı tipinden; büyük harf için biraz geniş.
 */
export function signFit(name: string, font: string | undefined, max = 188, min = 40): CSSProperties {
    const width = resolveFont(font, 'esnaf').charWidth.regular * 1.12;
    const longestWord = Math.max(3, ...name.split(/\s+/).map(w => w.length));
    const basis = name.length <= 13 ? Math.max(4, name.length) : Math.max(longestWord, Math.min(13, name.length / 2));
    return { fontSize: `min(${max}px, max(${min}px, ${(94 / (basis * width)).toFixed(2)}cqi))` };
}

export interface TodayHours {
    /** "Şu an açık", "Şu an kapalı", "Bugün kapalı", "Bugün" */
    label: string;
    /** "11:00 – 23:00"; kapalı gün ya da saat girilmemişse null. */
    hours: string | null;
    open: boolean | null;
}

/** Tabeladaki "Şu an açık · 11:00 – 23:00" satırı (bugünün saati). Saat girilmemişse null. */
export function todayHours(site: PublicSite): TodayHours | null {
    const today = weekSchedule(site)?.find(r => r.isToday);
    if (!today) return null;
    if (!today.isOpen) return { label: 'Bugün kapalı', hours: null, open: false };
    if (site.isOpenNow === true) return { label: 'Şu an açık', hours: today.text, open: true };
    if (site.isOpenNow === false) return { label: 'Şu an kapalı', hours: today.text, open: false };
    return { label: 'Bugün', hours: today.text, open: null };
}

/**
 * "Bugün ne yesek?" panosunun ürünleri: önce ustanın seçtikleri (öne çıkan, tükenmemiş), az kalırsa kategorilerin
 * baştaki ürünleriyle tamamlanır (her kategoriden sırayla birer tane). En çok `max`.
 */
export function boardHighlights(site: PublicSite, max = 6): PublicProduct[] {
    const all = site.categories.flatMap(c => c.products).filter(p => !p.isOutOfStock);
    const picks = all.filter(p => p.isFeatured).slice(0, max);
    if (picks.length >= Math.min(4, max)) return picks;
    const chosen = new Set(picks.map(p => p.id));
    const queues = site.categories.map(c => c.products.filter(p => !p.isOutOfStock && !chosen.has(p.id)));
    const out = [...picks];
    for (let round = 0; out.length < max && queues.some(q => q.length > round); round++) {
        for (const q of queues) {
            if (out.length >= max) break;
            if (q[round]) out.push(q[round]);
        }
    }
    return out;
}

/** Paket siparişin kısa bilgisi, açık mahallelerden: en kısa süre ve en düşük alt tutar (gerçek veri; yoksa null). */
export function deliveryFacts(ordering: OnlineOrdering | null): { minutes: number | null; minOrder: number | null } {
    const zones = (ordering?.zones ?? []).filter(z => z.isActive);
    const minutes = zones.map(z => z.estimatedMinutes).filter(m => m > 0);
    const orders = zones.map(z => z.minOrderAmount).filter(m => m > 0);
    return {
        minutes: minutes.length ? Math.min(...minutes) : null,
        minOrder: orders.length === zones.length && orders.length > 0 ? Math.min(...orders) : null,
    };
}

// ── Ortak menünün (DeliveryMenu, variant "esnaf") fiyat panosu duvarı (EsnafMenuParts.tsx) ──

/** Panoların kapsayıcısı (DeliveryMenu'nün bölüm listesi yerine). */
export const ESNAF_BOARD_WALL = 'columns-1 gap-5 pb-6 pt-6 md:pt-8 @3xl:columns-2 @6xl:columns-3';

/** Bir panonun (bölüm) sınıfı: sütunda bölünmez; tam genişlik bölümler bütün sütunları kaplar. */
export function esnafPanelClass(fullWidth: boolean): string {
    return cn('rb-es-board mb-5 break-inside-avoid overflow-hidden rounded-md', fullWidth && '[column-span:all]');
}
