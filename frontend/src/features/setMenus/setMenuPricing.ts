import { DiscountType } from './types';

// Sunucudaki hesabın (Domain/Shared/Discount.cs ve SetMenu.RecalculatePrice) aynısı; düzenleyicide canlı önizleme için.
// Kaydedilen fiyatı her zaman sunucu hesaplar.

/** İndirimli fiyat; kuruşa yuvarlanır, 0'ın altına inmez. */
export function applyDiscount(price: number, type: DiscountType, value: number): number {
    let discounted = price;
    if (type === DiscountType.Percent) discounted = price - (price * value) / 100;
    else if (type === DiscountType.Amount) discounted = price - value;
    return Math.max(0, Math.round(discounted * 100) / 100);
}

export interface PricedOption { price: number; isDefault: boolean; }

/** Bölümün taban fiyatı: varsayılan seçenek, varsayılan yoksa en ucuz seçenek. Tek seçenekli bölümde o seçenek. */
export function slotBasePrice(options: PricedOption[]): number {
    if (options.length === 0) return 0;
    const chosen = options.length === 1 ? options[0] : options.find(o => o.isDefault);
    return chosen ? chosen.price : Math.min(...options.map(o => o.price));
}

/** Seçeneğin ek ücreti: kendi fiyatı − taban fiyat (0'ın altına inmez). */
export function surchargeOf(optionPrice: number, basePrice: number): number {
    return Math.max(0, Math.round((optionPrice - basePrice) * 100) / 100);
}

/** Geçersiz indirimde kullanıcıya gösterilecek mesaj; geçerliyse null. */
export function discountError(type: DiscountType, value: number): string | null {
    if (type === DiscountType.None) return null;
    if (!Number.isFinite(value) || value < 0) return 'İndirim 0\'dan küçük olamaz.';
    if (type === DiscountType.Percent && value > 100) return 'Yüzde indirim en fazla %100 olabilir.';
    return null;
}
