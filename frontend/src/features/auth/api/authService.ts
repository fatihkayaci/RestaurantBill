import type { Register } from '../types';
import { api } from '@/lib/axiosInstance';

export const authService = {
    logout: () => {
        localStorage.removeItem('token');
    },
    login: async (userName: string, password: string) => {
        const response = await api.post<string>(`/auth/login`, {
            UserName: userName,
            Password: password
        });
        return response.data;
    },
    register: async (request: Register) => {
        const response = await api.post<string>(`/auth/register`, {
            FullName: request.fullName,
            PhoneNumber: request.phoneNumber,
            Email: request.email,
            Password: request.password,
            RestaurantName: request.restaurantName,
        });
        return response.data;
    },
};
