// "2026-12-17T..." → "17 Aralık 2026".
export function formatDay(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
