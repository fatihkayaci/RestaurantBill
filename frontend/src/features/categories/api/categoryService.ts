import { api } from '@/lib/axiosInstance';
import type { Category } from '../types';

export const categoryService = {
    getCategories: async () => {
        const response = await api.get<Category[]>('/category');
        return response.data;
    },
    createCategory: async (name: string) => {
        await api.post('/category/create', {
            Name: name,
            IdempotencyKey: crypto.randomUUID()
        });
    },
    updateCategory: async (data: Category) => {
        await api.post('/category/update', {
            Id: data.id,
            Name: data.name
        });
    },
    deleteCategory: async (id: string) => {
        await api.delete(`/category/${id}`);
    },
};
