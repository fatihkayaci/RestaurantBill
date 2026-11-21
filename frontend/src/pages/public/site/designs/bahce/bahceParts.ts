import type { CSSProperties } from 'react';
import type { PublicSite, ReservationDay } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { cn } from '@/lib/utils';
import { serif } from '../../siteParts';
import { weekSchedule } from '../../useSite';

// "Bahçe Kahvaltısı" düzeninin ortak sınıfları ve yardımcıları. Dil: sabah ışığı, bahçede kurulmuş bir sofra (yukarıdan
// bakılmış), yuvarlak tabaklar, kareli masa örtüsü, yaprak. Bütün renkler sitenin --site-* değişkenlerinden (tema ve özel
// vurgu her birleşimde çalışsın); örtü deseni, tabak kenarı, organik biçimler siteThemes.css'te (`rb-bh-*`).

/** İçerik genişliği. */
export const bhWrap = 'mx-auto w-full max-w-[1200px] px-4 sm:px-8';
/** Okuma genişliği (hikâye, sorular). */
export const bhNarrow = 'mx-auto w-full max-w-[760px] px-4 sm:px-8';

/** Kalın, samimi grotesk başlık (Bricolage); sıkı satır. */
export const bhDisplay = cn(serif, 'm-0 break-words leading-[0.92] tracking-[-0.035em]');
/** Bölüm başlığı. */
export const bhTitle = cn(serif, 'm-0 break-words text-[34px] leading-[1] tracking-[-0.03em] sm:text-[46px] md:text-[54px]');

const buttonBase = 'inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-[15px] font-bold no-underline transition-[transform,filter,background-color,border-color] duration-200 active:scale-[0.98] motion-reduce:transition-none';
export const bhButton = {
    /** Vurgu rengi dolu düğme. */
    accent: cn(buttonBase, 'bg-[var(--site-accent)] text-[var(--site-on-accent)] hover:brightness-110'),
    /** Tereyağı düğme (koyu yazı, her temada aynı okunurluk). */
    butter: cn(buttonBase, 'bg-[var(--site-mustard)] text-[var(--site-text)] shadow-[inset_0_-3px_0_color-mix(in_srgb,var(--site-text)_14%,transparent)] hover:brightness-105'),
    /** Beyaz, ince çizgili düğme. */
    soft: cn(buttonBase, 'border border-[var(--site-border-mid)] bg-[var(--site-card)] text-[var(--site-text)] hover:border-[var(--site-text)]'),
};

/** Vurgu renginde metin bağlantısı (altı tereyağı çizgi). */
export const bhLink = 'inline-flex min-h-11 items-center gap-1.5 text-[15px] font-bold text-[var(--site-accent-text)] underline decoration-[var(--site-mustard)] decoration-[3px] underline-offset-[6px] transition-[text-decoration-color] hover:decoration-[var(--site-accent-text)]';

/** Küçük yuvarlak bilgi çipi. */
export const bhChip = 'inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--site-border)] bg-[var(--site-card)] px-3.5 text-sm font-semibold text-[var(--site-text)]';

/** Kategori şeridinin sekmesi: yuvarlak çip; seçili olan tereyağı (DeliveryMenu, variant "bahce"). */
export function bahceTabClass(selected: boolean): string {
    return cn('flex h-11 shrink-0 items-center rounded-full border px-4 text-[15px] font-bold no-underline transition-colors',
        selected
            ? 'border-[var(--site-mustard)] bg-[var(--site-mustard)] text-[var(--site-text)]'
            : 'border-[var(--site-border)] bg-[var(--site-card)] text-[var(--site-sub)] hover:border-[var(--site-border-strong)] hover:text-[var(--site-text)]');
}

/**
 * Uzun adlar sığsın: boy, kapsayıcının genişliğine (`@container`, cqi) ve en uzun sözcüğün (ya da üç satıra bölünmüş
 * adın) harf sayısıyla yazı tipinin harf genişliğine göre. Kapsayıcıda `@container` sınıfı olmalı.
 */
export function nameStyle(name: string, charWidth: number, { max = 128, min = 34 } = {}): CSSProperties {
    const longest = Math.max(5, ...name.split(/\s+/).map(w => w.length), Math.ceil(name.length / 3));
    return { fontSize: `min(${max}px, max(${min}px, ${(94 / (longest * charWidth)).toFixed(2)}cqi))` };
}

// ── Saatler ─────────────────────────────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

export interface MorningLine {
    /** "Sabahtan açık", "Bugün açık", "Bugünlük kapandı", "Bugün kapalı" */
    label: string;
    /** "08:00 – 14:00" ya da "24 saat açık"; kapalıysa null. */
    hours: string | null;
    /** Şu an açık mı (nokta rengi); bilinmiyorsa null. */
    open: boolean | null;
}

/** Bugünün satırı, gerçek saatten. Açılış 11:00'den önceyse "Sabahtan açık". Saat girilmemişse null. */
export function morningLine(site: PublicSite, now = new Date()): MorningLine | null {
    const today = weekSchedule(site)?.find(r => r.isToday);
    if (!today) return null;
    if (!today.isOpen) return { label: 'Bugün kapalı', hours: null, open: false };
    const match = /(\d{2}:\d{2}) – (\d{2}:\d{2})/.exec(today.text);
    if (!match) return { label: 'Bugün açık', hours: today.text, open: site.isOpenNow };
    const opens = toMinutes(match[1]);
    const closes = toMinutes(match[2]);
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (site.isOpenNow === false && closes > opens && minutes >= closes) return { label: 'Bugünlük kapandı', hours: today.text, open: false };
    return { label: opens < 11 * 60 ? 'Sabahtan açık' : 'Bugün açık', hours: today.text, open: site.isOpenNow };
}

/** Hafta sonu (Cumartesi + Pazar) saatleri hafta içinden farklıysa kısa satır: "Hafta sonu 09:00 – 16:00". */
export function weekendLine(site: PublicSite): string | null {
    const rows = weekSchedule(site);
    if (!rows) return null;
    const sat = rows.find(r => r.day === 6);
    const sun = rows.find(r => r.day === 0);
    const weekday = rows.filter(r => r.day >= 1 && r.day <= 5 && r.isOpen).map(r => r.text);
    if (!sat || !sun) return null;
    const same = sat.text === sun.text;
    const differs = !weekday.includes(sat.text) || !weekday.includes(sun.text);
    if (!differs) return null;
    if (same) return sat.isOpen ? `Hafta sonu ${sat.text}` : 'Hafta sonu kapalı';
    return `Cumartesi ${sat.text}, Pazar ${sun.text}`;
}

// ── Hazır menüler ─────────────────────────────────────────────────────────────────────────────

const SERPME_WORDS = ['serpme', 'kahvaltı', 'brunch', 'sofra'];

/** Sofranın yıldızı: adı serpme/kahvaltı geçen hazır menü; yoksa öne çıkan, o da yoksa ilk satıştaki. */
export function starSetMenu(menus: OnlineSetMenu[]): OnlineSetMenu | null {
    const available = menus.filter(m => m.isAvailable);
    const named = available.find(m => SERPME_WORDS.some(w => m.name.toLocaleLowerCase('tr-TR').includes(w)));
    return named ?? available.find(m => m.isFeatured) ?? available[0] ?? null;
}

/** Menünün masaya gelenleri: sabit bölüm ürün adıyla, seçimli bölüm "<bölüm> seçimi". */
export function setMenuItems(menu: OnlineSetMenu): string[] {
    return menu.slots.map(slot => (slot.isFixed || slot.options.length === 1)
        ? (slot.options[0]?.productName ?? slot.name)
        : `${slot.name} seçimi`);
}

// ── Hafta sonu rezervasyonu ──────────────────────────────────────────────────────────────────

export interface WeekendDay {
    /** "2026-11-21" */
    date: string;
    /** Türkçe uzun gün adıyla tarih ("21 Kasım Cumartesi"). */
    label: string;
    /** İlk ve son başlangıç: "09:00 – 13:00". */
    window: string;
    /** Seçilebilir başlangıç saatleri (en çok `max`). */
    times: string[];
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function isoDate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slotTimes(day: ReservationDay, interval: number, after: number | null, max: number): string[] {
    const step = interval > 0 ? interval : 30;
    const out: string[] = [];
    for (let m = toMinutes(day.firstStart); m <= toMinutes(day.lastStart) && out.length < max; m += step) {
        if (after !== null && m <= after) continue;
        out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    }
    return out;
}

/**
 * Yaklaşan Cumartesi ve Pazar (rezervasyon ayarlarında açıksa ve ileri tarih sınırının içindeyse): başlangıç aralığı ve
 * birkaç saat. Yalnız gerçek ayarlardan; dolu masa bilgisi akışta görülür.
 */
export function upcomingWeekend(site: PublicSite, now = new Date(), max = 6): WeekendDay[] {
    const rules = site.reservation;
    const out: WeekendDay[] = [];
    const limit = rules.maxDaysAhead > 0 ? rules.maxDaysAhead : 30;
    for (let offset = 0; offset <= Math.min(limit, 7) && out.length < 2; offset++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        const weekday = d.getDay();
        if (weekday !== 6 && weekday !== 0) continue;
        const day = rules.days.find(x => x.day === weekday);
        if (!day?.isOpen || !day.firstStart || !day.lastStart) continue;
        const after = offset === 0 ? now.getHours() * 60 + now.getMinutes() : null;
        const times = slotTimes(day, rules.slotIntervalMinutes, after, max);
        if (times.length === 0) continue;
        out.push({
            date: isoDate(d),
            label: d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }),
            window: day.firstStart === day.lastStart ? day.firstStart : `${day.firstStart} – ${day.lastStart}`,
            times,
        });
    }
    return out;
}

// ── Çizimli tabaklar ───────────────────────────────────────────────────────────────────────────

export type DishKind = 'egg' | 'tomato' | 'olive' | 'cheese' | 'honey' | 'bread' | 'tea';
export const DISH_CYCLE: DishKind[] = ['egg', 'tomato', 'olive', 'cheese', 'honey', 'bread'];

/** Ada göre sabit bir çizim (fotoğrafsız ürün her yerde aynı tabakla). */
export function dishFor(name: string): DishKind {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return DISH_CYCLE[h % DISH_CYCLE.length];
}
