import type { Order } from '../features/order/types';
import { api } from './axiosInstance';

export const orderService = {
    getOrderByTableId: async (tableId: string) => {
        const response = await api.get<Order>(`/order/table/${tableId}`); 
        return response.data;
    }
};