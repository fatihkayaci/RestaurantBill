import { publicApi } from '@/features/customerSite/api/publicService';
import type {
    CartLineInput, DeliveryQuote, DeliveryTracking, OnlineOrdering, PhoneVerificationSent, PhoneVerified,
    SubmitDeliveryOrderInput, SubmittedDeliveryOrder,
} from '../types';

// Müşteri sitesinin online paket sipariş uçları (api/public, girişsiz, X-Restaurant-Slug ile).
export const publicDeliveryService = {
    getOnlineOrdering: async (branchId?: string) => {
        const response = await publicApi.get<OnlineOrdering>('/online-ordering', { params: branchId ? { branchId } : undefined });
        return response.data;
    },
    /** pickup: gel al (bölge yok sayılır, teslimat ücreti ve en az tutar yok). */
    quote: async (branchId: string, zoneId: string | null, lines: CartLineInput[], pickup = false) => {
        const response = await publicApi.post<DeliveryQuote>('/delivery-orders/quote', { branchId, zoneId: pickup ? null : zoneId, lines, pickup });
        return response.data;
    },
    /** 409 { error: "Fiyatlar güncellendi", quote }: sipariş açılmadı, quote güncel fiyatlardır. */
    submit: async (input: SubmitDeliveryOrderInput) => {
        const response = await publicApi.post<SubmittedDeliveryOrder>('/delivery-orders', input, { timeout: 15000 });
        return response.data;
    },
    getTracking: async (token: string) => {
        const response = await publicApi.get<DeliveryTracking>(`/delivery-orders/${encodeURIComponent(token)}`);
        return response.data;
    },
    cancel: async (token: string) => {
        await publicApi.post(`/delivery-orders/${encodeURIComponent(token)}/cancel`);
    },
    sendPhoneCode: async (branchId: string, phone: string) => {
        const response = await publicApi.post<PhoneVerificationSent>('/phone-verification/send', { branchId, phone });
        return response.data;
    },
    verifyPhone: async (branchId: string, phone: string, code: string) => {
        const response = await publicApi.post<PhoneVerified>('/phone-verification/verify', { branchId, phone, code });
        return response.data;
    },
};
