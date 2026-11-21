import { api } from '@/lib/axiosInstance';
import type { CreateProduct, UpdateProduct, Product, ProductWithCost } from '../types';

export const productService = {
    getProducts: async () => {
        const response = await api.get<Product[]>('/product');
        return response.data;
    },
    /** Maliyet dahil liste; yalnızca Admin/Owner çağırabilir. */
    getProductsWithCost: async () => {
        const response = await api.get<ProductWithCost[]>('/product/with-cost');
        return response.data;
    },
    createProduct: async (form: CreateProduct) => {
        const response = await api.post(`/product`, {
            Name: form.name,
            Price: form.price,
            Cost: form.cost,
            IsActive: form.isActive,
            CategoryId: form.categoryId,
            Description: form.description,
            IsFeatured: form.isFeatured,
            IsNew: form.isNew,
            PrepMinutes: form.prepMinutes,
            TaxRate: form.taxRate,
            IdempotencyKey: crypto.randomUUID()
        });
        return response.data;
    },
    updateProduct: async (form: UpdateProduct) => {
        await api.post('/product/update', {
            Id: form.id,
            Name: form.name,
            Price: form.price,
            Cost: form.cost,
            IsActive: form.isActive,
            CategoryId: form.categoryId,
            // undefined alanlar JSON'a yazılmaz; sunucu onları olduğu gibi bırakır.
            Description: form.description,
            IsFeatured: form.isFeatured,
            IsNew: form.isNew,
            // Bu ikisi her zaman gönderilir; null "kaldır / kategori oranını kullan" demektir.
            PrepMinutes: form.prepMinutes,
            TaxRate: form.taxRate
        });
    },
    /** Bir kategorideki ürünlerin sırası: ilk id menüde, garsonda ve sitede ilk görünür. */
    reorderProducts: async (categoryId: string, orderedProductIds: string[]) => {
        await api.post('/product/reorder', { CategoryId: categoryId, OrderedProductIds: orderedProductIds });
    },
    /** "Tükendi" anahtarı: ürün masada satılmaya devam eder, online siparişte seçilemez. */
    setStock: async (id: string, isOutOfStock: boolean) => {
        await api.patch(`/product/${id}/stock`, { isOutOfStock });
    },
    deleteProduct: async (id: string) => {
        await api.delete(`/product/${id}`);
    },
    uploadProductImage: async (id: string, file: Blob, fileName = 'crop.jpg') => {
        const formData = new FormData();
        formData.append('file', file, fileName);
        const response = await api.post<string>(`/product/${id}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000
        });
        return response.data;
    },
    /** Hazır görsel kütüphanesinden seçer: dosya yüklenmez, ürün paylaşılan görseli gösterir. Tam CDN adresini döner. */
    setStockImage: async (id: string, stockImageId: string) => {
        const response = await api.post<string>(`/product/${id}/stock-image`, { stockImageId });
        return response.data;
    },
};
