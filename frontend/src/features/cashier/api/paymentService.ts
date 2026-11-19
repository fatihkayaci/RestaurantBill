import { api } from '@/lib/axiosInstance';

export interface PaymentItem {
    orderItemId: number;
    quantity: number;
    /** Ürün indirimi: bu kalemin bu ödemede ödenen adetlerine yüzde ya da tutar (ikisi birden değil). */
    discountPercent?: number;
    discountAmount?: number;
    /** İndirimin uygulanacağı adet (1..quantity); boşsa ödenen adetlerin tamamı. Tutar bu adetlerin toplam indirimidir. */
    discountQuantity?: number;
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
        discount?: PaymentDiscount,
        /** "Tutar gir": ürün seçmeden ödenen tutar (items boş gönderilir). */
        amount?: number
    ) => {
        const response = await api.post('/payment', {
            OrderId: orderId,
            CashRegisterId: cashRegisterId,
            PaymentMethod: paymentMethod,
            Items: items.map(i => ({
                OrderItemId: i.orderItemId,
                Quantity: i.quantity,
                DiscountPercent: i.discountPercent ?? null,
                DiscountAmount: i.discountAmount ?? null,
                DiscountQuantity: i.discountQuantity ?? null,
            })),
            Amount: amount ?? null,
            DiscountPercent: discount?.percent ?? null,
            DiscountAmount: discount?.amount ?? null,
            DiscountNote: discount?.note || null,
        });
        return response.data;
    },
};
