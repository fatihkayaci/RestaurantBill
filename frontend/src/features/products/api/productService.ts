import { api } from '@/lib/axiosInstance';
import type { CreateProduct, UpdateProduct, Product } from '../types';

export const productService = {
    getProducts: async () => {
        const response = await api.get<Product[]>('/product');
        return response.data;
    },
    createProduct: async (form: CreateProduct) => {
        const response = await api.post(`/product`, {
            Name: form.name,
            Price: form.price,
            IsActive: form.isActive,
            CategoryId: form.categoryId,
            Description: form.description,
            IsFeatured: form.isFeatured,
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
            IsActive: form.isActive,
            CategoryId: form.categoryId,
            // undefined alanlar JSON'a yazılmaz; sunucu onları olduğu gibi bırakır.
            Description: form.description,
            IsFeatured: form.isFeatured,
            // Bu ikisi her zaman gönderilir; null "kaldır / kategori oranını kullan" demektir.
            PrepMinutes: form.prepMinutes,
            TaxRate: form.taxRate
        });
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
};
