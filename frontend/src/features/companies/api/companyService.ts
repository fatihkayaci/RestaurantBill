import type { Company, UpdateCompany } from '../types';
import { api } from '@/lib/axiosInstance';

export const companyService = {
    getMyCompany: async (): Promise<Company> => {
        const response = await api.get<Company>(`/company`);
        return response.data;
    },
    updateCompany: async (data: UpdateCompany): Promise<Company> => {
        const response = await api.post<Company>(`/company`, { Name: data.name });
        return response.data;
    },
    setBranchSlug: async (branchId: string, slug: string): Promise<string> => {
        const response = await api.post<string>(`/company/branches/${branchId}/slug`, { Slug: slug });
        return response.data;
    },
};
