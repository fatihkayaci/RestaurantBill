import { api } from '@/lib/axiosInstance';

export interface PaymentItem {
    orderItemId: number;
    quantity: number;
}

export const paymentService = {
    createPayment: async (orderId: number, cashRegisterId: string, paymentMethod: number, items: PaymentItem[]) => {
        const response = await api.post('/payment', {
            OrderId: orderId,
            CashRegisterId: cashRegisterId,
            PaymentMethod: paymentMethod,
            Items: items.map(i => ({ OrderItemId: i.orderItemId, Quantity: i.quantity })),
        });
        return response.data;
    },
};
