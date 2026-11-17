import axios from 'axios';
import { getTenantSlug } from '@/lib/tenant';
import type {
    Availability, DaySlot, OrderRequestStatus, PublicSite, PublicTableInfo, ReservationDetail, ReservationStatusInfo,
    TableActionResult,
} from '../types';
import type { TableIbanPayment } from '../tableIbanPayment';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5077';

// Müşteri sitesi girişsizdir: personel token'ı, 401'de girişe yönlendirme ve "veri değişti" olayı
// bu isteklerde yok. Bu yüzden ortak `api` yerine ayrı, sade bir istemci kullanılır.
export const publicApi = axios.create({
    baseURL: `${API_BASE_URL}/api/public`,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
});

publicApi.interceptors.request.use((config) => {
    // Çağıran slug'ı kendisi verdiyse (admin'deki site önizlemesi) o kalır.
    const slug = getTenantSlug();
    if (slug && !config.headers['X-Restaurant-Slug']) config.headers['X-Restaurant-Slug'] = slug;
    return config;
});

/** Masa talebinin kalemi: ürün ya da menü (set); paket siparişin sepet satırıyla (CartLineInput) aynı biçim. */
export interface OrderRequestItemInput {
    /** Verilmezse ürün (ön sipariş yalnız ürün alır). */
    kind?: 'product' | 'setMenu';
    productId?: string;
    setMenuId?: string;
    quantity: number;
    note: string;
    /** Menü: bölüm → ürün (varsayılanlar dahil); üründe boş. */
    selections?: { slotId: string; productId: string }[];
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
    /** `slug`: alan adı yerine bu restoranın sitesi (admin'deki düzenleyicinin önizlemesi). */
    getSite: async (branchId?: string, slug?: string) => {
        const response = await publicApi.get<PublicSite>('/site', {
            params: branchId ? { branchId } : undefined,
            headers: slug ? { 'X-Restaurant-Slug': slug } : undefined,
        });
        return response.data;
    },
    getTable: async (tableId: string) => {
        // ibanPayment: restoran "IBAN ile öde"yi açmadıysa null.
        const response = await publicApi.get<PublicTableInfo & { ibanPayment?: TableIbanPayment | null }>(`/table/${tableId}`);
        return response.data;
    },
    getAvailability: async (branchId: string, date: string, time: string) => {
        const response = await publicApi.get<Availability>('/availability', { params: { branchId, date, time } });
        return response.data;
    },
    getDaySlots: async (branchId: string, date: string) => {
        const response = await publicApi.get<DaySlot[]>('/day-slots', { params: { branchId, date } });
        return response.data;
    },
    createOrderRequest: async (tableId: string, items: OrderRequestItemInput[], note: string) => {
        const response = await publicApi.post<OrderRequestStatus>('/order-requests', { tableId, items, note });
        return response.data;
    },
    /** Masaya bakan garsonlara canlı uyarı; aynı masadan 60 sn içinde tekrar bildirilmez. */
    callWaiter: async (tableId: string) => {
        const response = await publicApi.post<TableActionResult>(`/table/${tableId}/call-waiter`);
        return response.data;
    },
    /** Masanın açık hesabı için hesap isteği; açık hesap yoksa hata döner. */
    requestBill: async (tableId: string) => {
        const response = await publicApi.post<TableActionResult>(`/table/${tableId}/request-bill`);
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
    /** Rezervasyon sayfası: özet, ön sipariş penceresi ve mevcut ön sipariş. */
    /** "Rezervasyon sorgula": kod + telefon eşleşirse rezervasyon bağlantısının anahtarı; yoksa 400 (tek, genel mesaj). */
    lookupReservation: async (code: string, phone: string) => {
        const response = await publicApi.post<{ accessToken: string }>('/reservations/lookup', { code, phone });
        return response.data;
    },
    getReservationByToken: async (token: string) => {
        const response = await publicApi.get<ReservationDetail>(`/reservations/by-token/${encodeURIComponent(token)}`);
        return response.data;
    },
    /** Ön siparişi ver ya da değiştir; fiyatlar sunucuda hesaplanır. Güncel sayfa verisini döner. */
    savePreOrder: async (token: string, items: OrderRequestItemInput[], note: string) => {
        const response = await publicApi.put<ReservationDetail>(`/reservations/${encodeURIComponent(token)}/pre-order`, { items, note });
        return response.data;
    },
    /** Misafirin kendi iptali: kod + telefon (sorgulamayla aynı). Güncel sayfa verisini döner; eşleşmezse 400 (genel mesaj). */
    cancelReservation: async (code: string, phone: string) => {
        const response = await publicApi.post<ReservationDetail>('/reservations/cancel', { code, phone });
        return response.data;
    },
    cancelPreOrder: async (token: string) => {
        const response = await publicApi.delete<ReservationDetail>(`/reservations/${encodeURIComponent(token)}/pre-order`);
        return response.data;
    },
};
