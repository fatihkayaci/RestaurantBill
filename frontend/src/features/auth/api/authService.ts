import type { LoginResponse, Register } from '../types';
import { api } from '@/lib/axiosInstance';

export const authService = {
    logout: () => {
        localStorage.removeItem('token');
    },
    login: async (loginField: string, password: string) => {
        const isEmail = loginField.includes('@');
        const response = await api.post<LoginResponse>(`/auth/login`, {
            UserName: isEmail ? undefined : loginField,
            Email: isEmail ? loginField : undefined,
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
