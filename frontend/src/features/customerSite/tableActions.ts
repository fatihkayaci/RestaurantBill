// Masa QR'ının "Garson çağır" ve "Hesap iste" sabitleri: değerler sunucudaki WaiterCallReason ve BillPaymentHint ile
// aynıdır. Personel bildirimleri ve müşteri QR ekranı aynı metinleri kullanır.

/** Garson çağırma nedeni. "Hesap" neden değildir: hesap isteği requestTableBill ile gider. */
export const WaiterCallReason = {
    Water: 1,
    Cutlery: 2,
    Other: 3,
} as const;
export type WaiterCallReason = (typeof WaiterCallReason)[keyof typeof WaiterCallReason];

export const WAITER_CALL_REASONS: readonly { value: WaiterCallReason; label: string; staffText: string }[] = [
    { value: WaiterCallReason.Water, label: 'Su', staffText: 'Su istiyor' },
    { value: WaiterCallReason.Cutlery, label: 'Peçete/çatal', staffText: 'Peçete/çatal istiyor' },
    { value: WaiterCallReason.Other, label: 'Diğer', staffText: 'Garson çağırıyor' },
];

/** "Diğer" notunun sınırı (sunucu da kırpar, kontrol karakterlerini atar). */
export const WAITER_CALL_NOTE_MAX = 100;

/** Personel ekranındaki kısa metin: "Su istiyor"; neden yoksa (eski istemci) "Garson çağırıyor". */
export function waiterCallText(reason: number | null | undefined): string {
    return WAITER_CALL_REASONS.find(r => r.value === reason)?.staffText ?? 'Garson çağırıyor';
}

/** Hesap isterken müşterinin ödeme tercihi. */
export const BillPaymentHint = {
    Cash: 1,
    Card: 2,
    Iban: 3,
} as const;
export type BillPaymentHint = (typeof BillPaymentHint)[keyof typeof BillPaymentHint];

export const BILL_PAYMENT_HINTS: readonly { value: BillPaymentHint; label: string }[] = [
    { value: BillPaymentHint.Cash, label: 'Nakit' },
    { value: BillPaymentHint.Card, label: 'Kart' },
    { value: BillPaymentHint.Iban, label: 'IBAN' },
];

export const BILL_SPLIT_MIN = 2;
export const BILL_SPLIT_MAX = 20;

/** "Kart · 3 kişiye bölünecek", "Nakit", "4 kişiye bölünecek"; tercih yoksa boş. */
export function billHintText(paymentHint: number | null | undefined, splitCount: number | null | undefined): string {
    const parts: string[] = [];
    const hint = BILL_PAYMENT_HINTS.find(h => h.value === paymentHint);
    if (hint) parts.push(hint.label);
    if (splitCount && splitCount >= BILL_SPLIT_MIN) parts.push(`${splitCount} kişiye bölünecek`);
    return parts.join(' · ');
}
