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
