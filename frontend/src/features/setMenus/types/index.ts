/** Menü bölümündeki bir seçenek: ürün + isteğe bağlı ek ücret ("Kola +₺10"). */
export interface SetMenuOption {
    productId: string;
    productName: string;
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
    sortOrder: number;
    isFixed: boolean;
    options: SetMenuOption[];
}

/** Set menü ("Adana Menü"): sabit fiyatlı paket. */
export interface SetMenu {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    isActive: boolean;
    sortOrder: number;
    categoryId: string | null;
    categoryName: string | null;
    slots: SetMenuSlot[];
    /** Varsayılan seçeneklerle tahmini maliyet; yalnızca Admin/Owner yanıtında dolu. */
    estimatedCost: number | null;
}

/**
 * Oluşturma/güncelleme gövdesi: menünün tamamı gönderilir. Mevcut bölümler id'leriyle gelir ve sunucuda yerinde
 * güncellenir (id değişmez); id'siz bölüm yenidir, gönderilmeyen bölüm silinir.
 */
export interface SetMenuInput {
    name: string;
    description: string;
    price: number;
    isActive: boolean;
    sortOrder: number;
    categoryId: string | null;
    slots: {
        /** Mevcut bölümün id'si; yeni bölümde yok. */
        id?: string;
        name: string;
        options: { productId: string; surcharge: number; isDefault: boolean }[];
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
        price: menu.price,
        isActive: menu.isActive,
        sortOrder: menu.sortOrder,
        categoryId: menu.categoryId,
        slots: menu.slots.map(slot => ({
            id: slot.id,
            name: slot.name,
            options: slot.options.map(o => ({ productId: o.productId, surcharge: o.surcharge, isDefault: o.isDefault })),
        })),
    };
}
