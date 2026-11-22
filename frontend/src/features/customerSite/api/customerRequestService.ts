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
    /** reason: müşteriye "Onaylanmadı" kartında gösterilir (isteğe bağlı, en fazla 300 karakter). */
    rejectOrderRequest: async (id: string, reason?: string) => {
        await api.post(`/order-request/${id}/reject`, reason ? { reason } : {});
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
    /** "Geldi": masa açılır, bekleyen ön sipariş mutfağa gider. */
    seatReservation: async (id: string) => {
        await api.post(`/reservation/${id}/seat`);
    },
    /** "Gelmedi": bekleyen ön sipariş iptal edilir. */
    markReservationNoShow: async (id: string) => {
        await api.post(`/reservation/${id}/no-show`);
    },
    /** "Mutfağa şimdi gönder": ön sipariş misafir gelmeden mutfağa gider. */
    firePreOrder: async (id: string) => {
        await api.post(`/reservation/${id}/fire-pre-order`);
    },
};
