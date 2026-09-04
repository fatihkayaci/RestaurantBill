import type { Order } from '../types';
import { api } from '@/lib/axiosInstance';

export const orderService = {
    getAllOrdersToKitchen: async () => {
        const response = await api.get<Order[]>(`/order/kitchen`);
        return response.data;
    },
    getAllOrdersToCashier: async () => {
        const response = await api.get<Order[]>(`/order/cashier`);
        return response.data;
    },
    getOrderByTableId: async (tableId: string) => {
        const response = await api.get<Order>(`/order/table/${tableId}`);
        return response.data;
    },
    addOrderItems: async (activeOrder: Order) => {
        const response = await api.post<{ message: string }>(`/order/add-product`, {
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
        const response = await api.post(`/order/cancel`, {
            OrderId: orderId
        });
        return response.data;
    },
    closeOrder: async (orderId: number) => {
        const response = await api.post(`/order/close`, {
            orderId: orderId
        });
        return response.data;
    },
    removeOrderItem: async (productId: string, orderId: number) => {
        const response = await api.post(`/order/item/remove`, {
            ProductId: productId,
            OrderId: orderId
        });
        return response.data;
    },
    updateOrderStatus: async (orderId: number, status: number) => {
        const response = await api.post(`/order/${orderId}/status`, { status });
        return response.data;
    },
    updateOrderItemStatus: async (orderId: number, itemId: number, status: number) => {
        const response = await api.post(`/order/${orderId}/item/${itemId}/status`, { status });
        return response.data;
    },
    updateOrderItemNote: async (orderId: number, itemId: number, note: string) => {
        const response = await api.post(`/order/${orderId}/item/${itemId}/note`, { note });
        return response.data;
    },
    updateOrderItemQuantity: async (orderId: number, productId: string, quantity: number) => {
        const response = await api.post(`/order/item/quantity`, {
            orderId,
            productId,
            quantity
        });
        return response.data;
    },
    transferOrder: async (sourceTableId: string, destinationTableId: string, mode: 1 | 2 | 3) => {
        const response = await api.post(`/order/transfer`, {
            SourceTableId: sourceTableId,
            DestinationTableId: destinationTableId,
            Mode: mode
        });
        return response.data;
    }
};
