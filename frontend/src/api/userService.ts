import { api } from './axiosInstance';
import type { User, CreateUser } from '../features/auths/userTypes';

export const userService = {
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
    updateUser: async (data: User & { passwordHash?: string }) => {
        await api.put('/user/update-user', {
            Id: data.id,
            FullName: data.fullName,
            UserName: data.userName,
            Email: data.email,
            PhoneNumber: data.phoneNumber,
            UserCode: data.userCode,
            Role: data.role
        });
    },
    deleteUser: async (id: number) => {
        await api.delete(`/user/${id}`);
    },
};
