import { api } from '@/lib/axiosInstance';
import type { CourierCashSummary, CourierDaySummary, CourierHandoverResult, CourierOrder, DoorPaymentMethod } from '../types';

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
};

// Kasiyerin kurye kasası: kuryelerin üzerindeki tahsilat ve "Teslim al".
export const courierCashService = {
    getCouriers: async () => {
        const response = await api.get<CourierCashSummary[]>('/delivery-orders/couriers');
        return response.data;
    },
    handover: async (courierUserId: string, cashRegisterId: string, deliveryOrderIds: string[]) => {
        const response = await api.post<CourierHandoverResult>(`/delivery-orders/couriers/${courierUserId}/handover`, {
            cashRegisterId,
            deliveryOrderIds,
        });
        return response.data;
    },
};
