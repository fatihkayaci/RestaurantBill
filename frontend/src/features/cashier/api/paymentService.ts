import { api } from '@/lib/axiosInstance';

export const paymentService = {
    createPayment: async (orderId: number, cashRegisterId: string, paymentMethod: number) => {
        const response = await api.post('/payment', {
            OrderId: orderId,
            CashRegisterId: cashRegisterId,
            PaymentMethod: paymentMethod,
        });
        return response.data;
    },
};
