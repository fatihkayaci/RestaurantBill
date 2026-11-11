import axios from 'axios';
import { getTenantSlug } from '@/lib/tenant';
import type {
    Availability, OrderRequestStatus, PublicSite, PublicTableInfo, ReservationStatusInfo,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5077';

// Müşteri sitesi girişsizdir: personel token'ı, 401'de girişe yönlendirme ve "veri değişti" olayı
// bu isteklerde yok. Bu yüzden ortak `api` yerine ayrı, sade bir istemci kullanılır.
const publicApi = axios.create({
    baseURL: `${API_BASE_URL}/api/public`,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
});

publicApi.interceptors.request.use((config) => {
    const slug = getTenantSlug();
    if (slug) config.headers['X-Restaurant-Slug'] = slug;
    return config;
});

export interface OrderRequestItemInput {
    productId: string;
    quantity: number;
    note: string;
}

export interface ReservationInput {
    tableId: string;
    guestName: string;
    contact: string;
    date: string;
    time: string;
    partySize: number;
    note: string;
}

export const publicService = {
    getSite: async (branchId?: string) => {
        const response = await publicApi.get<PublicSite>('/site', { params: branchId ? { branchId } : undefined });
        return response.data;
    },
    getTable: async (tableId: string) => {
        const response = await publicApi.get<PublicTableInfo>(`/table/${tableId}`);
        return response.data;
    },
    getAvailability: async (branchId: string, date: string, time: string) => {
        const response = await publicApi.get<Availability>('/availability', { params: { branchId, date, time } });
        return response.data;
    },
    createOrderRequest: async (tableId: string, items: OrderRequestItemInput[], note: string) => {
        const response = await publicApi.post<OrderRequestStatus>('/order-requests', { tableId, items, note });
        return response.data;
    },
    getOrderRequestStatus: async (id: string) => {
        const response = await publicApi.get<OrderRequestStatus>(`/order-requests/${id}`);
        return response.data;
    },
    createReservation: async (input: ReservationInput) => {
        const response = await publicApi.post<ReservationStatusInfo>('/reservations', input);
        return response.data;
    },
    getReservationStatus: async (id: string) => {
        const response = await publicApi.get<ReservationStatusInfo>(`/reservations/${id}`);
        return response.data;
    },
};
