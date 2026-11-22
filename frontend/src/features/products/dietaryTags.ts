// Ürünlerin alerjen ve diyet etiketleri: sabit liste, sunucuda bayrak (bit) olarak saklanır (Product.Allergens /
// Product.DietTags). Değerler sunucudaki ProductAllergen / ProductDietTag ile birebir aynıdır, değiştirilmez.
// Admin ürün formu ve müşteri menüsü (QR, site, paket) bu dosyayı kullanır.

export interface DietaryOption {
    /** Bayrağın değeri (2'nin kuvveti). */
    value: number;
    /** Kısa ad (çip). */
    label: string;
    /** Uzun açıklama (ipucu / ayrıntı ekranı); yoksa label. */
    hint?: string;
}

/** "İçerir": AB'nin 14 alerjeni. */
export const ALLERGENS: readonly DietaryOption[] = [
    { value: 1 << 0, label: 'Gluten', hint: 'Buğday, arpa, çavdar, yulaf' },
    { value: 1 << 1, label: 'Süt', hint: 'Süt ve süt ürünleri (laktoz dahil)' },
    { value: 1 << 2, label: 'Yumurta' },
    { value: 1 << 3, label: 'Yer fıstığı' },
    { value: 1 << 4, label: 'Sert kabuklu yemiş', hint: 'Antep fıstığı, ceviz, fındık, badem, kaju…' },
    { value: 1 << 5, label: 'Susam' },
    { value: 1 << 6, label: 'Soya' },
    { value: 1 << 7, label: 'Balık' },
    { value: 1 << 8, label: 'Kabuklu deniz ürünü', hint: 'Karides, yengeç, ıstakoz' },
    { value: 1 << 9, label: 'Yumuşakça', hint: 'Midye, kalamar, ahtapot' },
    { value: 1 << 10, label: 'Hardal' },
    { value: 1 << 11, label: 'Kereviz' },
    { value: 1 << 12, label: 'Sülfit', hint: 'Kükürt dioksit ve sülfitler' },
    { value: 1 << 13, label: 'Acı bakla', hint: 'Lupin' },
];

export const SPICY_TAG = 1 << 4;

/** "Uygun" iddiaları ve "Acılı" bilgi etiketi. */
export const DIET_TAGS: readonly DietaryOption[] = [
    { value: 1 << 0, label: 'Vegan' },
    { value: 1 << 1, label: 'Vejetaryen' },
    { value: 1 << 2, label: 'Glutensiz' },
    { value: 1 << 3, label: 'Helal' },
    { value: SPICY_TAG, label: 'Acılı' },
];

/** Bayraklardan seçili seçenekler (listedeki sırayla). */
export function flagsToOptions(flags: number | null | undefined, options: readonly DietaryOption[]): DietaryOption[] {
    const value = flags ?? 0;
    return options.filter(o => (value & o.value) !== 0);
}

/** "Gluten, Süt" gibi kısa metin; hiç yoksa boş. */
export function flagsToLabel(flags: number | null | undefined, options: readonly DietaryOption[]): string {
    return flagsToOptions(flags, options).map(o => o.label).join(', ');
}

export function toggleFlag(flags: number, value: number): number {
    return (flags & value) !== 0 ? flags & ~value : flags | value;
}
