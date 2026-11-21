import { api } from '@/lib/axiosInstance';
import type { Category } from '../types';

export const categoryService = {
    getCategories: async () => {
        const response = await api.get<Category[]>('/category');
        return response.data;
    },
    createCategory: async (name: string, taxRate: number | null) => {
        await api.post('/category/create', {
            Name: name,
            TaxRate: taxRate,
            IdempotencyKey: crypto.randomUUID()
        });
    },
    updateCategory: async (data: Category) => {
        await api.post('/category/update', {
            Id: data.id,
            Name: data.name,
            TaxRate: data.taxRate,
            // Gönderilmezse sunucuda değişmez.
            MenuDisplay: data.menuDisplay,
        });
    },
    /** Kategorilerin sırası: ilk id menüde, garsonda ve sitede ilk görünür. */
    reorderCategories: async (orderedCategoryIds: string[]) => {
        await api.post('/category/reorder', { OrderedCategoryIds: orderedCategoryIds });
    },
    deleteCategory: async (id: string) => {
        await api.delete(`/category/${id}`);
    },
};
