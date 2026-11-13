// Tutarları Türkçe biçimde iki ondalıkla yazar: 1234.5 → "1.234,50". Para birimi işaretini çağıran ekler.
export function formatAmount(value: number): string {
    return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Fiyat ve özet tutarlar için: tam sayıyı kuruşsuz (1.120), küsuratlıyı iki haneyle (35,50) yazar.
export function formatPrice(value: number): string {
    const fractionDigits = Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2;
    return value.toLocaleString('tr-TR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}

// Yüzde değişim: +12.5 → "+%12,5". null, önceki dönemde veri olmadığı için hesaplanamayan değişimdir.
export function formatPercentChange(value: number): string {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}%${Math.abs(value).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

// Para: "₺1.234" (küsurat varsa en fazla 3 hane, toLocaleString varsayılanı). Kopyaları buraya toplandı.
export function formatTL(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
}

// Para, sabit ondalıkla: formatCurrency(1234.5) → "₺1.235", formatCurrency(1234.5, 2) → "₺1.234,50".
export function formatCurrency(value: number, decimals = 0): string {
    return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// Geçen süre, tek biçim: 65 dk → "1 sa 5 dk", 7 dk → "7 dk".
export function formatMinutes(totalMinutes: number): string {
    const minutes = Math.max(0, Math.floor(totalMinutes));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours > 0 ? `${hours} sa ${rest} dk` : `${rest} dk`;
}

// Bir ISO zamandan şimdiye kadar geçen süre: formatElapsed(order.createdAt, now) → "1 sa 5 dk".
export function formatElapsed(since: string, now: number = Date.now()): string {
    return formatMinutes((now - new Date(since).getTime()) / 60000);
}

// Hazırlanma süresi geri sayımı: kalemin hedef anına kalan (ya da geçen) dakika. Süresi yoksa null.
export function prepCountdown(createdAt: string, prepMinutes: number | null | undefined, now: number = Date.now()):
    { overdue: boolean; minutes: number } | null {
    if (prepMinutes == null) return null;
    const dueAt = new Date(createdAt).getTime() + prepMinutes * 60000;
    const diffMinutes = (dueAt - now) / 60000;
    return diffMinutes > 0
        ? { overdue: false, minutes: Math.ceil(diffMinutes) }
        : { overdue: true, minutes: Math.floor(-diffMinutes) };
}
