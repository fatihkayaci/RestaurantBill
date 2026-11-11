import { api } from '@/lib/axiosInstance';
import type { OrderRequest, StaffReservation } from '../types';

// Müşteriden gelen sipariş ve rezervasyon taleplerinin personel tarafı.
export const customerRequestService = {
    getPendingOrderRequests: async () => {
        const response = await api.get<OrderRequest[]>('/order-request');
        return response.data;
    },
    approveOrderRequest: async (id: string) => {
        await api.post(`/order-request/${id}/approve`);
    },
    rejectOrderRequest: async (id: string) => {
        await api.post(`/order-request/${id}/reject`);
    },
    getReservations: async () => {
        const response = await api.get<StaffReservation[]>('/reservation');
        return response.data;
    },
    confirmReservation: async (id: string) => {
        await api.post(`/reservation/${id}/confirm`);
    },
    rejectReservation: async (id: string) => {
        await api.post(`/reservation/${id}/reject`);
    },
    cancelReservation: async (id: string) => {
        await api.post(`/reservation/${id}/cancel`);
    },
};
