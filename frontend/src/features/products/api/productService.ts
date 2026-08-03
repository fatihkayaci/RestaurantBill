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
            CategoryId: form.categoryId
        });
    },
    deleteProduct: async (id: string) => {
        await api.delete(`/product/${id}`);
    },
};
