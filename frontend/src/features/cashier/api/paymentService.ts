import { api } from '@/lib/axiosInstance';

export interface PaymentItem {
    orderItemId: number;
    quantity: number;
}

export interface PaymentDiscount {
    percent?: number;
    amount?: number;
    note?: string;
}

export const paymentService = {
    createPayment: async (
        orderId: number,
        cashRegisterId: string,
        paymentMethod: number,
        items: PaymentItem[],
        discount?: PaymentDiscount
    ) => {
        const response = await api.post('/payment', {
            OrderId: orderId,
            CashRegisterId: cashRegisterId,
            PaymentMethod: paymentMethod,
            Items: items.map(i => ({ OrderItemId: i.orderItemId, Quantity: i.quantity })),
            DiscountPercent: discount?.percent ?? null,
            DiscountAmount: discount?.amount ?? null,
            DiscountNote: discount?.note || null,
        });
        return response.data;
    },
};
