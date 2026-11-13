// Türkiye IBAN'ı: "TR" + 24 hane = 26 karakter, ISO 13616 mod-97 kontrolü. Sunucudaki TurkishIban ile aynı kural.
export const TR_IBAN_LENGTH = 26;

export function normalizeIban(value: string): string {
    return value.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidTrIban(value: string): boolean {
    const iban = normalizeIban(value);
    if (iban.length !== TR_IBAN_LENGTH || !/^TR\d{24}$/.test(iban)) return false;
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    const digits = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
    // Büyük sayı yerine parça parça mod 97.
    let remainder = 0;
    for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
    return remainder === 1;
}

/** "TR33 0006 1005 1978 6457 8413 26" */
export function formatIban(value: string): string {
    return normalizeIban(value).replace(/(.{4})/g, '$1 ').trim();
}
