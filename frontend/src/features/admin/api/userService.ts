import { api } from '@/lib/axiosInstance';
import type { User, CreateUser, UpdateUser } from '../types';

export const userService = {
    getCurrentUser: async (): Promise<User> => {
        const response = await api.get<User>('/user/me');
        return response.data;
    },
    getUsersByRestaurantId: async () => {
        const response = await api.get<User[]>(`/user`);
        return response.data;
    },
    createUser: async (data: CreateUser) => {
        await api.post('/user/create', {
            FullName: data.fullName,
            UserName: data.userName,
            Email: data.email,
            PhoneNumber: data.phoneNumber,
            PasswordHash: data.passwordHash,
            UserCode: data.userCode,
            Role: data.role
        });
    },
    updateUser: async (data: UpdateUser) => {
        await api.post('/user/update', {
            UserId: data.id,
            FullName: data.fullName,
            UserName: data.userName,
            Email: data.email,
            PhoneNumber: data.phoneNumber,
            Password: data.password,
            UserCode: data.userCode,
            Role: data.role,
            IsActive: data.isActive
        });
    },
    deleteUser: async (id: string) => {
        await api.delete(`/user/${id}`);
    },
};
