import { api } from '@/lib/axiosInstance';
import type { Category, CategoryAvailabilityInput } from '../types';

export const categoryService = {
    getCategories: async () => {
        const response = await api.get<Category[]>('/category');
        return response.data;
    },
    /** availability verilmezse "Her zaman". */
    createCategory: async (name: string, taxRate: number | null, availability?: CategoryAvailabilityInput) => {
        await api.post('/category/create', {
            Name: name,
            TaxRate: taxRate,
            Availability: availability ? { Days: availability.days, From: availability.from, Until: availability.until } : undefined,
            IdempotencyKey: crypto.randomUUID()
        });
    },
    /** availability verilmezse servis penceresi değişmez; "Her zaman" için üç alanı null gönderin. */
    updateCategory: async (data: Category, availability?: CategoryAvailabilityInput) => {
        await api.post('/category/update', {
            Id: data.id,
            Name: data.name,
            TaxRate: data.taxRate,
            // Gönderilmezse sunucuda değişmez.
            MenuDisplay: data.menuDisplay,
            Availability: availability ? { Days: availability.days, From: availability.from, Until: availability.until } : undefined,
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
