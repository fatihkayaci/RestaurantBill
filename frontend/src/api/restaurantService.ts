import type { CreateRestaurant, Restaurant } from '../features/Restaurants/types';
import { api } from './axiosInstance';

export const restaurantService = {
    getRestaurantsByUserId: async () => {
        const response = await api.get<Restaurant[]>(`/restaurant`);
        return response.data;
    },
    create: async (data: CreateRestaurant) => {
        const response = await api.post(`/restaurant`, data);
        return response.data;
    }
};