import { formatPrice } from '@/lib/format';

/**
 * Masa QR sayfasındaki "IBAN ile öde" (GET /public/table/{id} → ibanPayment). Restoran Ayarlar → Ödeme'de açmadıysa ya da
 * IBAN geçerli değilse sunucu hiç göndermez (null).
 */
export interface TableIbanPayment {
    /** Boşluksuz "TR..." (kopyalanan değer). */
    iban: string;
    /** "TR33 0006 ..." (ekranda gösterilen). */
    ibanFormatted: string;
    accountHolder: string;
    /** Boş olabilir. */
    bankName: string;
    /** Dekontun gönderileceği WhatsApp numarası; boşsa WhatsApp düğmesi yok. */
    whatsappPhone: string;
    /** Gösterilen ve "Ara" ile aranan numara; boş olabilir. */
    phone: string;
}

/**
 * wa.me numarası: "0532 000 48 48" / "+90 532 …" / "532…" → "905320004848". Başka ülke numarası (sitenin WhatsApp'ı
 * uluslararası girilmiş olabilir) rakamlarıyla kalır. Rakam yoksa null.
 */
export function waNumber(phone: string): string | null {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10 && digits.startsWith('5')) digits = `90${digits}`;
    else if (digits.startsWith('00')) digits = digits.slice(2);
    return digits.length >= 10 ? digits : null;
}

/** Dekont mesajı: "Merhaba, Masa 5 için 1.250,00 ₺ ödemeyi IBAN ile yaptım. Dekontu ekliyorum." */
export function receiptMessage(tableName: string, amount: number | null): string {
    const sum = amount != null && amount > 0 ? `${formatPrice(amount)} ₺ ` : '';
    return `Merhaba, ${tableName} için ${sum}ödemeyi IBAN ile yaptım. Dekontu ekliyorum.`;
}

export function receiptWhatsappUrl(phone: string, tableName: string, amount: number | null): string | null {
    const number = waNumber(phone);
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(receiptMessage(tableName, amount))}` : null;
}

export function telLink(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Panoya yazar; navigator.clipboard yoksa (eski tarayıcı, http) gizli metin alanıyla execCommand('copy'). */
export async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            // Bazı tarayıcılarda (odak/izin beklerken) söz hiç sonuçlanmaz; 1,5 sn sonra eski yola düşülür.
            const ok = await Promise.race([
                navigator.clipboard.writeText(text).then(() => true),
                new Promise<false>(resolve => setTimeout(() => resolve(false), 1500)),
            ]);
            if (ok) return true;
        }
    } catch { /* aşağıdaki yola düş */ }
    try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '-1000px';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(area);
        return ok;
    } catch {
        return false;
    }
}
