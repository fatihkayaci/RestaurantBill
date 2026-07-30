import type { Branch, CreateRestaurant, Restaurant } from '../types';
import { api } from '@/lib/axiosInstance';

export const restaurantService = {
    getMyRestaurant: async (): Promise<Restaurant> => {
        const response = await api.get<Restaurant>(`/restaurant`);
        return response.data;
    },
    getMyBranches: async (): Promise<Branch[]> => {
        const response = await api.get<Branch[]>(`/restaurant/branches`);
        return response.data;
    },
    createBranch: async (name: string): Promise<Restaurant> => {
        const response = await api.post<Restaurant>(`/restaurant/branches`, { Name: name });
        return response.data;
    },
    setBranchSlug: async (id: number, slug: string): Promise<string> => {
        const response = await api.post<string>(`/restaurant/branches/${id}/slug`, { Slug: slug });
        return response.data;
    },
    updateBranch: async (id: number, data: CreateRestaurant): Promise<void> => {
        await api.post(`/restaurant/branches/${id}`, data);
    },
};
