import type { Order } from '../features/order/types';
import { api } from './axiosInstance';

export const orderService = {
    getOrderByTableId: async (tableId: string) => {
        const response = await api.get<Order>(`/order/table/${tableId}`); 
        return response.data;
    },
    addOrderItems: async (activeOrder: Order) => {
        const response = await api.post<{ message: string }>(`/order/add-product`,{
            orderId: activeOrder.id,
            note: activeOrder.note, 
            orderItems: activeOrder.orderItems
        });
        return response.data;
    },
    createOrder: async (tableId: string) => {
        const response = await api.post(`/order`, { 
            tableId: tableId
        }); 
        return response.data;
    },
    cancelOrder: async (orderId: number) => {
        const response = await api.post(`/order/cancel`,{
            OrderId: orderId
        }); 
        return response.data;
    },
    closeOrder: async(orderId: number) =>{
        const response = await api.post(`/order/close`,{
            orderId: orderId
        }); 
        return response.data;
    }
    
};