import { api } from '@/lib/axiosInstance';
import { publicApi } from '@/features/customerSite/api/publicService';
import type { ContactMessage, ContactMessageInput } from '../types';

// Ziyaretçi tarafı (girişsiz, restoran slug başlığıyla): İletişim formu.
export const publicContactService = {
    submit: async (input: ContactMessageInput) => {
        await publicApi.post('/contact-messages', input);
    },
};

// Admin "Şikayet ve Öneriler".
export const contactMessageService = {
    getAll: async (unreadOnly = false) => {
        const response = await api.get<ContactMessage[]>('/contact-messages', { params: unreadOnly ? { unreadOnly: true } : undefined });
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
