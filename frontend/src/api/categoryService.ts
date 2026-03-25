import { api } from './axiosInstance';
import type { Category } from '../features/categories/types';

export const categoryService = {
    getCategories: async () => {
        const response = await api.get<Category[]>('/category'); 
        return response.data;
    }
};