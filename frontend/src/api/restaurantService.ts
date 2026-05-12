import type { CreateRestaurant, Restaurant } from '../features/Restaurants/types';
import { api } from './axiosInstance';

export const restaurantService = {
    getMyRestaurant: async (): Promise<Restaurant> => {
        const response = await api.get<Restaurant>(`/restaurant`);
        return response.data;
    },
    update: async (data: CreateRestaurant) => {
        const response = await api.post(`/restaurant`, data);
        return response.data;
    }
};