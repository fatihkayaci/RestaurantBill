import { api } from '@/lib/axiosInstance';
import type { BranchSite } from '../types';

export type SiteImageSlot = 'cover' | 'about';

export type BranchSiteInput = Omit<BranchSite, 'coverImageUrl' | 'aboutImageUrl'>;

// Admin "Restoran sitesi" sayfası: oturumdaki şubenin müşteri sitesi içeriği.
export const siteSettingsService = {
    get: async () => {
        const response = await api.get<BranchSite>('/branch/site');
        return response.data;
    },
    update: async (input: BranchSiteInput) => {
        const response = await api.put<BranchSite>('/branch/site', input);
        return response.data;
    },
    uploadImage: async (slot: SiteImageSlot, file: File) => {
        const formData = new FormData();
        formData.append('file', file, file.name);
        const response = await api.post<BranchSite>(`/branch/site/image/${slot}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
        return response.data;
    },
    removeImage: async (slot: SiteImageSlot) => {
        const response = await api.delete<BranchSite>(`/branch/site/image/${slot}`);
        return response.data;
    },
};
