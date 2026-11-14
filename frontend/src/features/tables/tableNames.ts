// Toplu masa eklemede adlar backend'deki BulkCreateTablesCommand.BuildNames ile aynı kuralla üretilir:
// ön ek boşsa yalnızca numara, değilse "Ön ek + boşluk + numara".
export function buildTableNames(prefix: string, startNumber: number, count: number): string[] {
    const trimmed = prefix.trim();
    return Array.from({ length: count }, (_, i) => {
        const number = startNumber + i;
        return trimmed ? `${trimmed} ${number}` : `${number}`;
    });
}

// "Masa 7" ve "Masa 12" varsa "Masa" için sıradaki numara 13'tür; hiç yoksa 1.
export function nextTableNumber(existingNames: string[], prefix: string): number {
    const trimmed = prefix.trim();
    const numbers = existingNames.flatMap(name => {
        const rest = trimmed ? (name.startsWith(`${trimmed} `) ? name.slice(trimmed.length + 1) : null) : name;
        return rest !== null && /^\d+$/.test(rest) ? [Number(rest)] : [];
    });
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

// "Kaydet ve yeni ekle" için: sondaki numarayı bir artırır ("Masa 5" → "Masa 6"); numara yoksa boş döner.
export function incrementTableName(name: string): string {
    const match = name.match(/^(.*?)(\d+)$/);
    return match ? `${match[1]}${Number(match[2]) + 1}` : '';
}
