import { api } from './axiosInstance';
import type { Product } from '../features/products/types';

export const productService = {
    getProducts: async () => {
        const response = await api.get<Product[]>('/product'); 
        return response.data;
    },
    deleteProduct: async (id: number) => {
        await api.delete(`/product/${id}`);
    },
};