import { api } from '@/lib/axiosInstance';

/** Hazır görsel kütüphanesinin bir fotoğrafı; url tam CDN adresi. */
export interface StockImage {
    id: string;
    title: string;
    group: string | null;
    url: string;
}

// Hazır görsel kütüphanesi (ortak, şubeye bağlı değil). Seçim ürün/menü servislerindeki setStockImage ile yapılır.
export const stockImageService = {
    /** Türkçe harf duyarsız arama ("cay" → "Çay"); boş sorgu varsayılan listeyi döner. Owner/Admin. */
    search: async (q: string, signal?: AbortSignal) => {
        const response = await api.get<StockImage[]>('/stock-images', { params: { q }, signal });
        return response.data;
    },
};
