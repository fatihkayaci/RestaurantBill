import { api } from '@/lib/axiosInstance';
import type { User, CreateUser, UpdateUser } from '../types';

export const userService = {
    getCurrentUser: async (): Promise<User> => {
        const response = await api.get<User>('/user/me');
        return response.data;
    },
    // allBranches: şube modundaki owner için şirketin tüm şubelerini kapsar (Adminler sayfası).
    getUsersByRestaurantId: async (allBranches = false) => {
        const response = await api.get<User[]>(`/user`, { params: allBranches ? { allBranches: true } : undefined });
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
            Role: data.role,
            BranchId: data.branchId,
            BranchIds: data.branchIds,
            HireDate: data.hireDate
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
            IsActive: data.isActive,
            BranchId: data.branchId,
            BranchIds: data.branchIds,
            HireDate: data.hireDate
        });
    },
    deleteUser: async (id: string) => {
        await api.delete(`/user/${id}`);
    },
};
