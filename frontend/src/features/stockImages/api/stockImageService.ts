import { api } from '@/lib/axiosInstance';

/** Hazır görsel kütüphanesinin bir fotoğrafı; url tam CDN adresi. */
export interface StockImage {
    id: string;
    title: string;
    group: string | null;
    url: string;
}

/**
 * Kütüphanenin hangi bölümü: `venue` site fotoğrafları (mekân grupları önce; boş aramada yalnız onlar), `food` ürün ve
 * menüler (mekân grupları hariç). Verilmezse hepsi.
 */
export type StockImageScope = 'venue' | 'food';

/** Mekân/ortam fotoğraflarına ayrılmış gruplar (sunucudaki StockImageGroups.Venue ile aynı sıra ve yazım). */
export const VENUE_STOCK_GROUPS = ['Mekân', 'Kafe', 'Teras ve bahçe', 'Bar ve mutfak', 'Masa ve sofra'] as const;

export interface StockSearchOptions {
    scope?: StockImageScope;
    /** Tek grup ("Kafe"). */
    group?: string;
}

// Hazır görsel kütüphanesi (ortak, şubeye bağlı değil). Seçim ürün/menü servislerindeki setStockImage ile yapılır.
export const stockImageService = {
    /** Türkçe harf duyarsız arama ("cay" → "Çay"); boş sorgu varsayılan listeyi döner. Owner/Admin. */
    search: async (q: string, options: StockSearchOptions = {}, signal?: AbortSignal) => {
        const response = await api.get<StockImage[]>('/stock-images', {
            params: { q, scope: options.scope, group: options.group },
            signal,
        });
        return response.data;
    },
};
