/**
 * Ödeme ekranının para hesapları ve oturumluk hatıraları. Bölme ve para üstü kuruş (tam sayı) ile hesaplanır ki
 * ondalık kayması olmasın; kuruş artığı son kişiye kalır.
 */

export type PaymentMethod = 'kart' | 'nakit' | 'qr' | 'iban';
export const METHOD_LABEL: Record<PaymentMethod, string> = { nakit: 'Nakit', kart: 'Kart', qr: 'QR', iban: 'IBAN' };
/** Hesabı Böl → Eşit böl üst sınırı. */
export const MAX_PEOPLE = 30;
/** Tutar alanının düz yazımı (binlik ayırıcısız): 1234.5 → "1234,5". */
export const amountText = (value: number) => String(value).replace('.', ',');

/** 102.5 → 10250 kuruş. */
export const toKurus = (value: number) => Math.round(value * 100);
export const fromKurus = (kurus: number) => kurus / 100;

/**
 * Kişiye böl: kalan tutar, henüz ödemeyen kişilere bölünür. Son kişi dışındakiler tabana yuvarlanmış eşit payı,
 * son kişi kalanın tamamını öder (kuruş artığı onda). Her ödemeden sonra kalan yeniden bölünür; böylece araya
 * indirim girse de paylar kendiliğinden düzelir.
 */
export function splitShare(remaining: number, peopleLeft: number): number {
    const kurus = toKurus(remaining);
    if (peopleLeft <= 1) return fromKurus(kurus);
    return fromKurus(Math.floor(kurus / peopleLeft));
}

/** Para üstü; alınan tutar ödemeden azsa null. */
export function changeDue(received: number, net: number): number | null {
    const diff = toKurus(received) - toKurus(net);
    return diff >= 0 ? fromKurus(diff) : null;
}

/**
 * Ödeme ekranındaki nakit hızlı tutarları (en fazla 4): tam tutar, 1-2 yukarı yuvarlanmış hali, 500 ve 1.000.
 * 180 → [180, 200, 500, 1000]. Tutar banknotlardan büyükse yuvarlamalarla doldurulur.
 */
export function cashQuickAmounts(net: number): number[] {
    if (net <= 0) return [];
    const kurus = toKurus(net);
    const roundUp = (step: number) => Math.ceil(kurus / (step * 100)) * step;
    const rounded = [...new Set([10, 50, 100, 500, 1000].map(roundUp))].filter(v => toKurus(v) > kurus);
    const notes = [500, 1000].filter(v => toKurus(v) > kurus);
    const picks = [...new Set([...rounded.slice(0, 2), ...notes])];
    for (const v of rounded) if (picks.length < 3 && !picks.includes(v)) picks.push(v);
    return [fromKurus(kurus), ...picks.sort((a, b) => a - b)].slice(0, 4);
}

/** "102,5" ya da "102.5" → 102.5; geçersizse 0. */
export function parseMoney(text: string): number {
    const value = parseFloat(text.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? fromKurus(toKurus(value)) : 0;
}

// Tarayıcı deposu özel pencerede ya da engellenmiş site verisinde hata verebilir; her erişim sarılıdır.
function readJson<T>(storage: () => Storage, key: string): T | null {
    try {
        const raw = storage().getItem(key);
        return raw ? JSON.parse(raw) as T : null;
    } catch {
        return null;
    }
}

function writeJson(storage: () => Storage, key: string, value: unknown) {
    try {
        if (value === null) storage().removeItem(key);
        else storage().setItem(key, JSON.stringify(value));
    } catch { /* yoksay */ }
}

const session = () => sessionStorage;
const local = () => localStorage;

/** Kişiye böl ilerlemesi: kaç kişi ve kaçı ödedi. Sipariş başına oturumda tutulur (panel kapanıp açılsa da sürer). */
export interface SplitProgress { people: number; paid: number }
export const readSplit = (orderId: number | string) => readJson<SplitProgress>(session, `rb.pay.split.${orderId}`);
export const writeSplit = (orderId: number | string, value: SplitProgress | null) => writeJson(session, `rb.pay.split.${orderId}`, value);

/**
 * Bu cihazda bu hesaptan alınan ödemeler. Sunucu siparişte yalnızca tutar girilerek alınanların toplamını
 * (paidAmount) veriyor, ödeme listesi vermiyor; liste bu yüzden oturumluk tutulur.
 */
export interface PaymentLogEntry {
    amount: number;
    method: string;
    at: string;
    registerName?: string;
    /** Tutar girilerek (ürün seçmeden) alındı: sunucunun paidAmount toplamına girer. */
    onAccount: boolean;
}
export const readPaymentLog = (orderId: number | string) => readJson<PaymentLogEntry[]>(session, `rb.pay.log.${orderId}`) ?? [];
export const writePaymentLog = (orderId: number | string, value: PaymentLogEntry[] | null) => writeJson(session, `rb.pay.log.${orderId}`, value);

/** İndirim türü: yüzde, tutar ya da ikram (ücretsiz, %100). */
export type DiscountKind = 'percent' | 'amount' | 'ikram';

/** Henüz bir ödemeyle gönderilmemiş indirim; hesabı kapatan ödemede (ürünle ödemede o ürünle) sunucuya gider. */
export interface StagedDiscount {
    kind: DiscountKind;
    value: number;
    note: string;
}

export interface StagedLineDiscount extends StagedDiscount {
    /** İndirimli adet; boşsa satırın tamamı. */
    quantity?: number;
}

export interface StagedBillDiscount extends StagedDiscount {
    /**
     * Yüzdeli hesap indirimi, tutar girilerek ilk ödeme alınınca o anki tutara sabitlenir: sunucu yüzdeyi kapanış
     * ödemesindeki kalana uygular, sabitlenmezse kişi payları sonradan kayardı.
     */
    frozenAmount?: number;
}

export interface StagedDiscounts {
    bill?: StagedBillDiscount;
    lines: Record<string, StagedLineDiscount>;
}

/** Bekleyen (henüz bir ödemeyle gönderilmemiş) indirimler de oturumda sipariş başına tutulur. */
export const readStaged = <T>(orderId: number | string) => readJson<T>(session, `rb.pay.discounts.${orderId}`);
export const writeStaged = (orderId: number | string, value: unknown) => writeJson(session, `rb.pay.discounts.${orderId}`, value);

/** Yöneticinin son seçtiği kasa: kullanıcı + şube başına hatırlanır. */
const registerKey = (userId: string | null | undefined, branchId: string | null | undefined) =>
    `rb.pay.register.${userId ?? 'anon'}.${branchId ?? 'none'}`;
export const readLastRegister = (userId?: string | null, branchId?: string | null) => readJson<string>(local, registerKey(userId, branchId));
export const writeLastRegister = (userId: string | null | undefined, branchId: string | null | undefined, id: string) =>
    writeJson(local, registerKey(userId, branchId), id);
