import { useSyncExternalStore } from 'react';
import type { Table } from '@/features/tables/types';

// Garson ekranlarının ortak yardımcıları: masa durumu, renkler, tarih ayrıştırma, hızlı notlar.

/** Kartta gösterilen durum. "Hesap istendi", dolu masanın alt durumudur. */
export type TableState = 'free' | 'occ' | 'bill' | 'res';

export function tableState(table: Pick<Table, 'status' | 'billRequestedAt'>): TableState {
    if (table.status === 2) return table.billRequestedAt ? 'bill' : 'occ';
    if (table.status === 3) return 'res';
    return 'free';
}

export const STATE_STYLE: Record<TableState, { label: string; pill: string; dot: string; card: string }> = {
    free: {
        label: 'Boş',
        pill: 'bg-rb-green-bg text-rb-green',
        dot: 'bg-rb-green',
        card: 'bg-transparent border-[1.5px] border-dashed border-[#C9BDA6] dark:border-rb-border',
    },
    occ: {
        label: 'Dolu',
        pill: 'bg-rb-orange-bg text-rb-orange',
        dot: 'bg-rb-orange',
        card: 'bg-card border border-border shadow-[0_1px_2px_rgba(42,31,20,0.06)]',
    },
    bill: {
        label: 'Hesap istendi',
        pill: 'bg-rb-accent-bg text-rb-accent',
        dot: 'bg-rb-accent',
        card: 'bg-rb-accent-bg border-[1.5px] border-rb-accent/45',
    },
    res: {
        label: 'Rezerve',
        pill: 'bg-rb-amber-bg text-rb-amber',
        dot: 'bg-rb-amber',
        card: 'bg-rb-amber-bg border border-rb-amber/35',
    },
};

/** Sunucu UTC döner; "Z" eki yoksa ekler. */
export function parseUtc(value: string): number {
    return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`).getTime();
}

export function minutesSince(value: string, now: number): number {
    return Math.max(0, Math.floor((now - parseUtc(value)) / 60000));
}

export function clockTime(value: string): string {
    return new Date(parseUtc(value)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** Kısa ad: "Ayşe Yılmaz" → "Ayşe Y." */
export function shortName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return parts[0] ?? '';
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// Kategori adına göre hızlı not önerileri. Menüde bu notlar için ayrı bir ayar yok; tanınmayan
// kategoride yalnızca "Not yaz" görünür.
const QUICK_NOTE_RULES: { match: RegExp; notes: string[] }[] = [
    { match: /soğuk|buzlu|frozen|smoothie|limonata|milkshake|frappe/, notes: ['Buzsuz', 'Az buzlu', 'Şekersiz'] },
    { match: /sıcak|kahve|çay|latte|espresso|içecek/, notes: ['Şekersiz', 'Az şekerli', 'Laktozsuz'] },
    { match: /tatlı|dessert|pasta|dondurma/, notes: ['Dondurmalı', 'Paylaşımlık'] },
    { match: /kahvaltı/, notes: ['Az pişmiş yumurta', 'Domatessiz'] },
    { match: /(^|\s)et|ızgara|kebap|köfte|burger|steak|mangal/, notes: ['Az pişmiş', 'Orta', 'İyi pişmiş', 'Acısız'] },
    { match: /salata/, notes: ['Sossuz', 'Soğansız'] },
    { match: /pizza|makarna|pasta|ana yemek|çorba/, notes: ['Acısız', 'Soğansız'] },
];

export function quickNotesFor(categoryName: string): string[] {
    const name = categoryName.toLocaleLowerCase('tr-TR');
    return QUICK_NOTE_RULES.find(rule => rule.match.test(name))?.notes ?? [];
}

/** Garsonun en son seçtiği kasa (birden çok açık kasa varken). */
export const REGISTER_STORAGE_KEY = 'rb.waiter.cashRegisterId';

export function readStoredRegister(): string | null {
    try { return localStorage.getItem(REGISTER_STORAGE_KEY); } catch { return null; }
}

export function storeRegister(id: string) {
    try { localStorage.setItem(REGISTER_STORAGE_KEY, id); } catch { /* yoksay */ }
}

// Tablet düzeni (sol masa ızgarası + sağ masa paneli) 1024px ve üstünde.
const SPLIT_QUERY = '(min-width: 1024px)';

function subscribeSplit(callback: () => void) {
    const media = window.matchMedia(SPLIT_QUERY);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
}

export function useSplitLayout(): boolean {
    return useSyncExternalStore(subscribeSplit, () => window.matchMedia(SPLIT_QUERY).matches, () => false);
}
