import type { Order } from '../types';
import { api } from '@/lib/axiosInstance';

/** Siparişe eklenecek bir satır (POST /order/add-product gövdesindeki orderItems öğesi). */
export interface NewOrderItem {
    productId: string;
    quantity: number;
    note: string;
}

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
        const response = await api.get<Order | null>(`/order/table/${tableId}`);
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
    /** Var olan siparişe satırları tek istekte ekler; sunucu yalnızca orderId, note ve orderItems bekler. */
    addItems: async (orderId: number, note: string, items: NewOrderItem[]) => {
        const response = await api.post<{ message: string }>(`/order/add-product`, { orderId, note, orderItems: items });
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
    /** Satırı Id ile çıkarır; menü satırı içindeki ürünlerle birlikte gider. Menü satırları yalnızca böyle çıkarılır. */
    removeOrderLine: async (orderId: number | string, orderItemId: number | string) => {
        const response = await api.post(`/order/item/remove`, { orderId, orderItemId });
        return response.data;
    },
    /** Satırın adedini Id ile değiştirir; menü satırında içindeki ürünlerin adedi de değişir (hepsi beklemedeyse). */
    updateOrderLineQuantity: async (orderId: number | string, orderItemId: number | string, quantity: number) => {
        const response = await api.post(`/order/item/quantity`, { orderId, orderItemId, quantity });
        return response.data;
    },
    /**
     * Satırın verilen adedini iptal eder (3 ayrandan 1'i); adet satırın tamamıysa satır çıkar. Mutfağa geçmiş ürün de
     * iptal edilir, mutfak ekranı OrderUpdated ile yenilenir. Menü satırında menü adedi düşer. Sipariş iptaliyle aynı yetki.
     */
    cancelOrderLine: async (orderId: number | string, orderItemId: number | string, quantity: number, reason?: string) => {
        const response = await api.post(`/order/item/cancel`, { orderId, orderItemId, quantity, reason: reason?.trim() || null });
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
    /** Siparişin birden çok kalemini tek istekte aynı duruma taşır (mutfak pasası); garsona tek "hazır" bildirimi gider. */
    updateOrderItemsStatus: async (orderId: number, orderItemIds: number[], status: number) => {
        const response = await api.post(`/order/${orderId}/items/status`, { orderItemIds, status });
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
    /** Hesabı kasaya bildirir; cancel=true isteği geri alır. */
    requestBill: async (orderId: number | string, cancel = false) => {
        const response = await api.post(`/order/${orderId}/request-bill`, { cancel });
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
