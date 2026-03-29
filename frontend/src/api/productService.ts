import { api } from './axiosInstance';
import type { CreateProduct, Product } from '../features/products/types';

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
            CategoryId: form.categoryId
        });
        return response.data;
    },
    updateProduct: async (form: Product) => {
        await api.post('/product/update', {
            Id: form.id,
            Name: form.name,
            Price: form.price,
            IsActive: form.isActive,
            CategoryId: form.categoryId
        });
    },
    deleteProduct: async (id: number) => {
        await api.delete(`/product/${id}`);
    },
};