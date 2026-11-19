import { api } from '@/lib/axiosInstance';
import { publicApi } from '@/features/customerSite/api/publicService';
import type { ContactMessage, ContactMessageInput } from '../types';

// Ziyaretçi tarafı (girişsiz, restoran slug başlığıyla): İletişim formu.
export const publicContactService = {
    submit: async (input: ContactMessageInput) => {
        await publicApi.post('/contact-messages', input);
    },
};

// "Şikayet ve Öneriler": şube modunda o şubenin, sahibin "Tümü" modunda bütün şubelerin mesajları.
export const contactMessageService = {
    /** `branchId`: "Tümü" modunda tek şubeye süzer. */
    getAll: async (unreadOnly = false, branchId?: string) => {
        const params: Record<string, string | boolean> = {};
        if (unreadOnly) params.unreadOnly = true;
        if (branchId) params.branchId = branchId;
        const response = await api.get<ContactMessage[]>('/contact-messages', { params });
        return response.data;
    },
    getUnreadCount: async () => {
        const response = await api.get<{ count: number }>('/contact-messages/unread-count');
        return response.data.count;
    },
    markRead: async (id: string) => {
        await api.post(`/contact-messages/${id}/read`);
    },
    remove: async (id: string) => {
        await api.delete(`/contact-messages/${id}`);
    },
};
