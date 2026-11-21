import type { PublicCategory, PublicSite } from '@/features/customerSite/types';
import { cn } from '@/lib/utils';
import { serif } from '../../siteParts';
import { weekSchedule } from '../../useSite';

// "Meyhane Gecesi" düzeninin ortak sınıfları ve yardımcıları. Dil: akşam, lamba ışığı, basılı meyhane menüsü. Bütün
// renkler sitenin --site-* değişkenlerinden (tema ve özel vurgu her birleşimde çalışsın); tasarıma özgü desen, ışık ve
// adisyon kenarı siteThemes.css'te (`rb-mh-*`).

/** İçerik genişliği: menü kartı gibi dar ve ortalı. */
export const mhWrap = 'mx-auto w-full max-w-[1160px] px-4 sm:px-8';
/** Gece kapağı üst menünün altına uzanır (üst menü kapakta saydam; düzenleyicide üst menü yok, kullanılmaz). */
export const mhUnderHeader = '-mt-[68px] lg:-mt-[84px]';
/** Okuma genişliği (hikâye, sorular). */
export const mhNarrow = 'mx-auto w-full max-w-[720px] px-4 sm:px-8';

/** Tabela harfi: başlık yazı tipi, sıkı satır. */
export const mhSign = cn(serif, 'm-0 break-words leading-[0.95] tracking-[-0.01em]');
/** Bölüm başlığı (ortalı, menü kartının bölüm adı gibi). */
export const mhTitle = cn(serif, 'm-0 break-words text-[34px] leading-[1.02] sm:text-[44px] md:text-[52px]');

const buttonBase = 'inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-md px-7 text-[15px] font-bold no-underline transition-[filter,border-color,background-color] duration-200';
export const mhButton = {
    /** Lamba rengi dolu düğme (koyu yazı). */
    lamp: cn(buttonBase, 'bg-[var(--site-accent)] text-[var(--site-on-accent)] hover:brightness-110'),
    /** İnce çizgili düğme (krem yazı). */
    line: cn(buttonBase, 'border border-[var(--site-border-strong)] text-[var(--site-text)] hover:border-[var(--site-accent-text)]'),
};

/** Vurgu renginde, alt çizgisi kayan metin bağlantısı. */
export const mhLink = 'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-[var(--site-accent-text)] underline decoration-[var(--site-accent-line)] decoration-1 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-[var(--site-accent-text)]';

/** Kategori şeridinin sekmesi: hap değil, altı vurgu çizgili yazı (basılı menünün bölüm sekmesi). */
export function meyhaneTabClass(selected: boolean): string {
    return cn('flex h-11 shrink-0 items-center border-b-2 px-3 font-[family-name:var(--site-serif)] text-[17px] no-underline transition-colors',
        selected ? 'border-[var(--site-accent-text)] text-[var(--site-text)]' : 'border-transparent text-[var(--site-sub)] hover:text-[var(--site-text)]');
}

/** Basılı menüdeki noktalı çizgi (ad ile fiyat arası). */
export const mhLeader = 'min-w-6 flex-1 -translate-y-[5px] border-b-2 border-dotted border-[var(--site-border-strong)]';

// Meze sayılan kategoriler: tepsi düzeninde (küçük kâseler) çizilir; ötekiler basılı menü satırı.
const MEZE_WORDS = ['meze', 'soğuk', 'başlangıç', 'aperatif', 'tapas', 'ara sıcak'];

/** Kategori adı meze/başlangıç mı ("Mezeler", "Soğuk mezeler", "Başlangıçlar", "Ara sıcaklar"…). */
export function isMezeCategory(name: string): boolean {
    const n = name.toLocaleLowerCase('tr-TR');
    return MEZE_WORDS.some(w => n.includes(w));
}

/** Ana sayfanın tepsisi: meze kategorisi; yoksa ürünü olan ilk kategori. */
export function trayCategory(site: PublicSite): PublicCategory | null {
    const filled = site.categories.filter(c => c.products.length > 0);
    return filled.find(c => isMezeCategory(c.name)) ?? filled[0] ?? null;
}

function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

export interface TonightLine {
    /** "Bu akşam açığız", "Bugün açığız", "Bugünlük kapandık", "Bugün kapalıyız" */
    label: string;
    /** "18:00 – 02:00" ya da "24 saat açık"; kapalıysa null. */
    hours: string | null;
    /** Şu an açık mı (nokta rengi); bilinmiyorsa null. */
    open: boolean | null;
}

/**
 * Kapaktaki "bu akşam" satırı, bugünün saatinden. Akşam 18:00'den sonra da açıksa (ya da gece yarısını aşıyorsa)
 * "Bu akşam açığız", değilse "Bugün açığız". Bugün kapanmışsa "Bugünlük kapandık". Saat girilmemişse null.
 */
export function tonightLine(site: PublicSite, now = new Date()): TonightLine | null {
    const today = weekSchedule(site)?.find(r => r.isToday);
    if (!today) return null;
    if (!today.isOpen) return { label: 'Bugün kapalıyız', hours: null, open: false };
    const match = /(\d{2}:\d{2}) – (\d{2}:\d{2})/.exec(today.text);
    if (!match) return { label: 'Bugün açığız', hours: today.text, open: site.isOpenNow };
    const opens = toMinutes(match[1]);
    const closes = toMinutes(match[2]);
    const overnight = closes <= opens;
    const evening = overnight || closes >= 18 * 60;
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (site.isOpenNow === false && !overnight && minutes >= closes) return { label: 'Bugünlük kapandık', hours: today.text, open: false };
    return { label: evening ? 'Bu akşam açığız' : 'Bugün açığız', hours: today.text, open: site.isOpenNow };
}

/** "?tarih=2026-11-14&saat=19:00&kisi=2" (ana sayfadaki hızlı seçici) → rezervasyon akışının başlangıç seçimi. */
export function reservationChoice(params: URLSearchParams): { date: string; time: string; partySize: number } | undefined {
    const date = params.get('tarih');
    const time = params.get('saat');
    const partySize = Number(params.get('kisi'));
    return date && /^\d{4}-\d{2}-\d{2}$/.test(date) && time && /^\d{2}:\d{2}$/.test(time) && partySize > 0
        ? { date, time, partySize } : undefined;
}
