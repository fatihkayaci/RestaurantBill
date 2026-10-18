// Tutarları Türkçe biçimde iki ondalıkla yazar: 1234.5 → "1.234,50". Para birimi işaretini çağıran ekler.
export function formatAmount(value: number): string {
    return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
