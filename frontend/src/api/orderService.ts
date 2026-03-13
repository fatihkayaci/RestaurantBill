import type { Order } from '../features/order/types';
import { api } from './axiosInstance';

export const orderService = {
    getOrderByTableId: async (tableId: string) => {
        const response = await api.get<Order>(`/order/table/${tableId}`); 
        return response.data;
    },
    createOrderItem: async (productId: number, orderId : number) => {
        const response = await api.put<{ message: string }>(`/order/add-product`,{
            productId: productId,
            orderId: orderId,
            quantity: 1,
        })
        return response.data;
    },
    createMultiplerOrderItems: async (productId: number, orderId : number) => {
        const response = await api.put<{ message: string }>(`/order/add-product`,{
            productId: productId,
            orderId: orderId,
            quantity: 1,
        })
        return response.data;
    },
};