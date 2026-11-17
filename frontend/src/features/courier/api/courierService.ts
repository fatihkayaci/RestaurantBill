import { api } from '@/lib/axiosInstance';
import type { CourierBulkDispatchResult, CourierCashSummary, CourierDaySummary, CourierHandoverHistory, CourierHandoverResult, CourierOrder, DoorPaymentMethod } from '../types';

// Kurye ekranı (api/courier): yalnızca kuryenin kendi siparişleri.
export const courierService = {
    getOrders: async () => {
        const response = await api.get<CourierOrder[]>('/courier/orders');
        return response.data;
    },
    getSummary: async () => {
        const response = await api.get<CourierDaySummary>('/courier/summary');
        return response.data;
    },
    dispatch: async (id: string) => {
        await api.post(`/courier/orders/${id}/dispatch`);
    },
    deliver: async (id: string, paymentMethod: DoorPaymentMethod) => {
        await api.post(`/courier/orders/${id}/deliver`, { paymentMethod });
    },
    /** Yanlış basılan teslimi geri alır (teslimden sonraki 2 dk, kasaya teslim edilmeden). */
    undoDeliver: async (id: string) => {
        await api.post(`/courier/orders/${id}/undo-deliver`);
    },
    /** "Hepsiyle yola çık": ekrandaki hazır siparişler tek seferde. */
    dispatchMany: async (ids: string[]) => {
        const response = await api.post<CourierBulkDispatchResult>('/courier/orders/dispatch', { ids });
        return response.data;
    },
};

// Kasiyerin kurye kasası: kuryelerin üzerindeki tahsilat ve "Teslim al".
export const courierCashService = {
    getCouriers: async () => {
        const response = await api.get<CourierCashSummary[]>('/delivery-orders/couriers');
        return response.data;
    },
    /** countedCash: kasiyerin saydığı nakit (teslimde nakit yoksa null). */
    handover: async (courierUserId: string, cashRegisterId: string, deliveryOrderIds: string[], countedCash: number | null = null) => {
        const response = await api.post<CourierHandoverResult>(`/delivery-orders/couriers/${courierUserId}/handover`, {
            cashRegisterId,
            deliveryOrderIds,
            countedCash,
        });
        return response.data;
    },
    /** Son günlerin teslimleri, sayım farkıyla (en yeni üstte). */
    getHandovers: async (days = 7) => {
        const response = await api.get<CourierHandoverHistory[]>('/delivery-orders/couriers/handovers', { params: { days } });
        return response.data;
    },
};
