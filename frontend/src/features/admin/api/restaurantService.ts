import type { CreateRestaurant, Restaurant } from '../types';
import { api } from '@/lib/axiosInstance';

export const restaurantService = {
    getMyRestaurant: async (): Promise<Restaurant> => {
        const response = await api.get<Restaurant>(`/restaurant`);
        return response.data;
    },
    update: async (data: CreateRestaurant) => {
        const response = await api.post(`/restaurant`, data);
        return response.data;
    },
    setSlug: async (slug: string): Promise<string> => {
        const response = await api.post<string>(`/restaurant/slug`, { Slug: slug });
        return response.data;
    }
};
