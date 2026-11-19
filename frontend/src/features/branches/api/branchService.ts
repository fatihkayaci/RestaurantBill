import type { Branch, CreateBranch, Restaurant, UpdateBranch } from '../types';
import { api } from '@/lib/axiosInstance';

// Şube eklenince/silinince yayınlanır; kenar çubuğundaki şube seçici listesini tazeler.
export const BRANCHES_CHANGED_EVENT = 'rb:branches-changed';

export const branchService = {
    getMyBranch: async (): Promise<Branch> => {
        const response = await api.get<Branch>(`/branch`);
        return response.data;
    },
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
            TaxRate: Number(data.taxRate),
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
            TaxRate: Number(data.taxRate),
        });
    },
    // Yumuşak silme: şube listelerden ve müşteri sitesinden düşer, geçmiş adisyon/ödeme kayıtları raporlarda kalır.
    deleteBranch: async (id: string): Promise<void> => {
        await api.delete(`/branch/branches/${id}`);
    },
    updateDayEndSettings: async (id: string, dayEndTime: string, timeZoneId: string): Promise<void> => {
        await api.post(`/branch/branches/${id}/day-end-settings`, {
            DayEndTime: dayEndTime,
            TimeZoneId: timeZoneId,
        });
    },
};
