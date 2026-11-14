export interface Product {
    id: string;
    name: string;
    price: number;
    isActive: boolean;
    categoryId: string;
    categoryName: string;
    imageUrl: string;
    /** Restoran sitesinde adın altında görünen kısa açıklama. */
    description: string;
    /** Sitenin ana sayfasındaki "Ustanın seçtikleri"nde gösterilir. */
    isFeatured: boolean;
    /** Tahmini hazırlanma süresi (dk); null: süre takibi yok. */
    prepMinutes: number | null;
    /** Ürüne özel KDV; null: kategorinin oranı. */
    taxRate: number | null;
    /** Siparişe yazılan oran: ürün ?? kategori ?? şube. */
    effectiveTaxRate: number;
    /** "Tükendi": masada satılır, online siparişte seçilemez. */
    isOutOfStock?: boolean;
}

/** Yalnızca Admin/Owner menü ekranı: maliyet garson, mutfak ve kasaya hiç gönderilmez. */
export interface ProductWithCost extends Product {
    /** Birim maliyet (₺); girilmemişse 0. */
    cost: number;
}

export interface CreateProduct {
    name: string;
    price: number;
    cost: number;
    isActive: boolean;
    categoryId: string;
    description?: string;
    isFeatured?: boolean;
    prepMinutes: number | null;
    taxRate: number | null;
}

export interface UpdateProduct {
    id: string;
    name: string;
    price: number;
    /** Gönderilmezse sunucuda değişmez. */
    cost?: number;
    isActive: boolean;
    categoryId: string;
    /** Gönderilmezse sunucuda değişmez (ör. "Satışta" düğmesi açıklamayı silmez). */
    description?: string;
    isFeatured?: boolean;
    /** Her güncellemede tam değer gönderilir: null süreyi kaldırır. */
    prepMinutes: number | null;
    /** null: kategorinin oranını kullan. */
    taxRate: number | null;
}
