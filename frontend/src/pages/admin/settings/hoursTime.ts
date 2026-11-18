// Haftalık saat formlarının (rezervasyon, online sipariş) ortak saat yardımcıları. Saatler "SS:DD", 24 saat biçiminde.

export const DAY_MINUTES = 24 * 60;

/** "23:00" → dakika. */
export const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

/** Dakika → "SS:DD"; gün aşımı (ör. 1470) günün içine katlanır. */
export const toTime = (minutes: number) => {
    const m = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Seçicideki saatler: 00:00'dan adımla. Kayıtlı saat bu adımlara düşmüyorsa (ör. 12:10) listeye eklenir. */
export function timeOptions(step: number, ...keep: string[]): string[] {
    const list: string[] = [];
    for (let m = 0; m < DAY_MINUTES; m += step) list.push(toTime(m));
    keep.filter(t => t && !list.includes(t)).forEach(t => list.push(t));
    return list.sort();
}
