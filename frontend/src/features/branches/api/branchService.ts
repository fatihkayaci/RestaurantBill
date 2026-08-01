import type { Branch, CreateBranch, Restaurant, UpdateBranch } from '../types';
import { api } from '@/lib/axiosInstance';

export const branchService = {
    getMyBranches: async (): Promise<Branch[]> => {
        const response = await api.get<Branch[]>(`/branch/branches`);
        return response.data;
    },
    createBranch: async (data: CreateBranch): Promise<Restaurant> => {
        const response = await api.post<Restaurant>(`/branch/branches`, {
            Name: data.name,
            ManagerName: data.managerName,
            PhoneNumber: data.phoneNumber,
            Email: data.email,
            City: data.city,
            District: data.district,
            OpenAddress: data.openAddress,
        });
        return response.data;
    },
    updateBranch: async (id: string, data: UpdateBranch): Promise<void> => {
        await api.post(`/branch/branches/${id}`, {
            Name: data.name,
            ManagerName: data.managerName,
            PhoneNumber: data.phoneNumber,
            Email: data.email,
            City: data.city,
            District: data.district,
            OpenAddress: data.openAddress,
        });
    },
};
