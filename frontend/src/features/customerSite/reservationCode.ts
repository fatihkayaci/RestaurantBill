import { ROOT_DOMAIN, getTenantSlug } from '@/lib/tenant';

// Kısa rezervasyon kodu ("K7M-2QP") ve rezervasyon bağlantısının paylaşımı: müşteri sitesi, sorgulama sayfası ve
// personel ekranları aynı biçimi kullanır. Alfabe sunucudakiyle (ReservationCode.Alphabet) aynı: 0/O/1/I/L yok.

export const RESERVATION_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const RESERVATION_CODE_LENGTH = 6;
export const RESERVATION_LOOKUP_PATH = '/rezervasyon-sorgula';

/** Yazılan kodun yalnız geçerli karakterleri, büyük harfle ("k7m-2q" → "K7M2Q"); en fazla 6. */
export function compactReservationCode(value: string): string {
    return [...value.toUpperCase()]
        .filter(c => RESERVATION_CODE_ALPHABET.includes(c))
        .join('')
        .slice(0, RESERVATION_CODE_LENGTH);
}

/** Kod alanı için: yazarken 3. karakterden sonra tire eklenir ("K7M2" → "K7M-2"). */
export function formatReservationCodeInput(value: string): string {
    const compact = compactReservationCode(value);
    return compact.length > 3 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : compact;
}

/** Arama için: boşluk ve tire atılır, büyük harfe çevrilir (alfabe dışı karakterler de atılmaz, eşleşmez). */
export function normalizeReservationCodeQuery(value: string): string {
    return value.toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Telefon alanı maskesi: "05xx xxx xx xx". "+90 532…" ya da "532…" biçiminde tam numara yazılınca/yapıştırılınca
 * da bu biçime döner. Yazım sırasında (henüz tamamlanmamışken) rakamlar gruplanır, numara değiştirilmez.
 */
export function formatTurkishPhoneInput(value: string): string {
    let digits = value.replace(/\D/g, '');
    if (digits.length >= 12 && digits.startsWith('90')) digits = digits.slice(2);
    if (digits.length === 10 && !digits.startsWith('0') && !digits.startsWith('90')) digits = `0${digits}`;
    if (digits.startsWith('0')) {
        digits = digits.slice(0, 11);
        return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean).join(' ');
    }
    // "90…" ile yazılıyor ya da başta 0 olmadan: 12 haneye kadar düz gruplar (12'de yukarıdaki biçime döner).
    digits = digits.slice(0, 12);
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/** "0532 123 45 67" → "905321234567" (wa.me biçimi); geçerli bir Türkiye cep/sabit numarası değilse null. */
export function whatsAppNumber(phone: string): string | null {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('90')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return digits.length === 10 && digits[0] !== '0' ? `90${digits}` : null;
}

/**
 * Müşterinin rezervasyon sayfasının tam adresi. Restoranın alan adındaysak (slug'lı adres ya da yerelde
 * VITE_DEV_TENANT_SLUG) o adres; değilse restoranın alt alan adı.
 */
export function reservationLinkUrl(accessToken: string, siteSlug?: string | null): string {
    const path = `/rezervasyon/${accessToken}`;
    if (getTenantSlug() || !siteSlug) return `${window.location.origin}${path}`;
    return `https://${siteSlug}.${ROOT_DOMAIN}${path}`;
}

/** Personelin müşteriye WhatsApp ile gönderdiği hazır mesaj. */
export function reservationShareText(code: string, url: string, when?: string): string {
    const lines = [
        when ? `Rezervasyonunuz: ${when}` : null,
        `Rezervasyon kodunuz: ${code}`,
        `Rezervasyonunuzu ve ön siparişinizi buradan görebilirsiniz: ${url}`,
    ].filter(Boolean);
    return lines.join('\n');
}

export function whatsAppShareUrl(phone: string, text: string): string | null {
    const number = whatsAppNumber(phone);
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}
