import type { Company } from '../types';
import { api } from '@/lib/axiosInstance';

export const companyService = {
    getMyCompany: async (): Promise<Company> => {
        const response = await api.get<Company>(`/company`);
        return response.data;
    },
    setBranchSlug: async (branchId: string, slug: string): Promise<string> => {
        const response = await api.post<string>(`/company/branches/${branchId}/slug`, { Slug: slug });
        return response.data;
    },
};
