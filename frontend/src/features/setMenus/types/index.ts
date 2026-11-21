/** İndirim türü; sunucudaki DiscountType ile aynı sayılar. */
export const DiscountType = { None: 0, Percent: 1, Amount: 2 } as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

/** Menü bölümündeki bir seçenek: ürün + isteğe bağlı indirim. Ek ücret fiyat farkından hesaplanır ("Kola +10 ₺"). */
export interface SetMenuOption {
    productId: string;
    productName: string;
    /** Ürünün normal (menü dışı) fiyatı. */
    productPrice: number;
    discountType: DiscountType;
    discountValue: number;
    /** Menü içindeki fiyatı: ürün fiyatı − indirim. */
    price: number;
    /** Bölümün taban fiyatına göre ek ücret. */
    surcharge: number;
    isDefault: boolean;
    /** Ürün pasifse bu seçenek siparişte seçilemez. */
    isProductActive: boolean;
    /** Ürünün birim maliyeti; yalnızca /set-menu/with-cost yanıtında dolu, diğerlerinde null. */
    cost: number | null;
}

/** Menünün bir bölümü ("Ana yemek", "İçecek"). Tek seçenekliyse sabit üründür. */
export interface SetMenuSlot {
    id: string;
    name: string;
    /** Bölümün kategorisi; seçenekler bu kategorinin ürünleri. Eski menülerde null. */
    categoryId: string | null;
    sortOrder: number;
    isFixed: boolean;
    options: SetMenuOption[];
}

/** Set menü ("Adana Menü"): fiyatı ürünlerden hesaplanan paket. */
export interface SetMenu {
    id: string;
    name: string;
    description: string;
    /** Satış fiyatı (menü indirimi düşülmüş). */
    price: number;
    /** Menü indirimi öncesi fiyat. */
    listPrice: number;
    discountType: DiscountType;
    discountValue: number;
    imageUrl: string;
    isActive: boolean;
    /** Sitede, QR masada ve paket siparişte "Şefin tavsiyesi" bölümünde gösterilir. */
    isFeatured: boolean;
    sortOrder: number;
    categoryId: string | null;
    categoryName: string | null;
    slots: SetMenuSlot[];
    /** Varsayılan seçeneklerle tahmini maliyet; yalnızca Admin/Owner yanıtında dolu. */
    estimatedCost: number | null;
}

/**
 * Oluşturma/güncelleme gövdesi: menünün tamamı gönderilir. Fiyat gönderilmez, sunucu ürün fiyatlarından hesaplar.
 * Mevcut bölümler id'leriyle gelir ve sunucuda yerinde güncellenir (id değişmez); id'siz bölüm yenidir, gönderilmeyen
 * bölüm silinir.
 */
export interface SetMenuInput {
    name: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    isActive: boolean;
    /** Gönderilmezse sunucu mevcut değeri korur. */
    isFeatured?: boolean;
    /** Gönderilmezse yeni menü sona eklenir, mevcut menünün sırası korunur (sıra "Sırala" modunda sürüklenerek değişir). */
    sortOrder?: number;
    categoryId: string | null;
    slots: {
        /** Mevcut bölümün id'si; yeni bölümde yok. */
        id?: string;
        /** Kategori seçilmişse sunucu adı kategoriden alır. */
        name: string;
        categoryId: string | null;
        options: { productId: string; isDefault: boolean; discountType: DiscountType; discountValue: number }[];
    }[];
}

/** POST /order/add-set-menu gövdesi. Seçim gönderilmeyen bölümde varsayılan seçenek kullanılır. */
export interface AddSetMenuToOrder {
    orderId: number | string;
    setMenuId: string;
    quantity: number;
    note?: string;
    selections: { slotId: string; productId: string }[];
}

/** Sunucudaki menüyü düzenleme gövdesine çevirir (ör. yalnızca "Satışta" anahtarını değiştirmek için). */
export function toSetMenuInput(menu: SetMenu): SetMenuInput {
    return {
        name: menu.name,
        description: menu.description,
        discountType: menu.discountType,
        discountValue: menu.discountValue,
        isActive: menu.isActive,
        isFeatured: menu.isFeatured,
        categoryId: menu.categoryId,
        slots: menu.slots.map(slot => ({
            id: slot.id,
            name: slot.name,
            categoryId: slot.categoryId,
            options: slot.options.map(o => ({
                productId: o.productId,
                isDefault: o.isDefault,
                discountType: o.discountType,
                discountValue: o.discountValue,
            })),
        })),
    };
}
