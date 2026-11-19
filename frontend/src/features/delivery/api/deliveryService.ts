import { api } from '@/lib/axiosInstance';
import type { CourierCashSummary } from '@/features/courier/types';
import type {
    BlockedPhone, DeliveryOrder, DeliveryZone, DeliveryZoneInput, OnlineOrderSettings, OnlineOrderSettingsInput,
} from '../types';

export interface OnlineOrderingStatus {
    branchId: string;
    paused: boolean;
    /** Ayarlarda online sipariş açık mı. */
    enabled: boolean;
}

// Personel: online siparişler panosu (Owner, Admin, Cashier).
export const deliveryService = {
    /** scope: active (açık siparişler) | today (bugünün iş günü, kapanmışlar dahil). */
    getOrders: async (scope: 'active' | 'today') => {
        const response = await api.get<DeliveryOrder[]>('/delivery-orders', { params: { scope } });
        return response.data;
    },
    getOrder: async (id: string) => {
        const response = await api.get<DeliveryOrder>(`/delivery-orders/${id}`);
        return response.data;
    },
    accept: async (id: string, etaMinutes: number) => {
        await api.post(`/delivery-orders/${id}/accept`, { etaMinutes });
    },
    reject: async (id: string, reason: string) => {
        await api.post(`/delivery-orders/${id}/reject`, { reason });
    },
    cancel: async (id: string, reason: string) => {
        await api.post(`/delivery-orders/${id}/cancel`, { reason });
    },
    /** courierUserId null: atama kaldırılır. */
    assignCourier: async (id: string, courierUserId: string | null) => {
        await api.post(`/delivery-orders/${id}/assign-courier`, { courierUserId });
    },
    /** Yalnızca Owner/Admin. */
    blockPhone: async (id: string, reason?: string) => {
        await api.post(`/delivery-orders/${id}/block-phone`, { reason });
    },
    getCouriers: async () => {
        const response = await api.get<CourierCashSummary[]>('/delivery-orders/couriers');
        return response.data;
    },
    getStatus: async () => {
        const response = await api.get<OnlineOrderingStatus>('/online-ordering/status');
        return response.data;
    },
    setPaused: async (paused: boolean) => {
        const response = await api.post<OnlineOrderingStatus>('/online-ordering/pause', { paused });
        return response.data;
    },
};

// Admin "Online sipariş" ayarları (Owner, Admin): oturumdaki şube.
export const onlineOrderingSettingsService = {
    getSettings: async () => {
        const response = await api.get<OnlineOrderSettings>('/online-ordering/settings');
        return response.data;
    },
    saveSettings: async (input: OnlineOrderSettingsInput) => {
        const response = await api.put<OnlineOrderSettings>('/online-ordering/settings', { ...input, resetToDefaults: false });
        return response.data;
    },
    /** Yalnızca "IBAN ile ödeme" anahtarı; hemen kaydedilir (Ayarlar → Ödeme ve Online sipariş → Genel). */
    setAcceptIban: async (acceptIban: boolean) => {
        const response = await api.put<OnlineOrderSettings>('/online-ordering/settings/iban', { acceptIban });
        return response.data;
    },
    getZones: async () => {
        const response = await api.get<DeliveryZone[]>('/delivery-zones');
        return response.data;
    },
    createZone: async (input: DeliveryZoneInput) => {
        const response = await api.post<DeliveryZone>('/delivery-zones', input);
        return response.data;
    },
    updateZone: async (id: string, input: DeliveryZoneInput) => {
        const response = await api.put<DeliveryZone>(`/delivery-zones/${id}`, input);
        return response.data;
    },
    deleteZone: async (id: string) => {
        await api.delete(`/delivery-zones/${id}`);
    },
    /** Tek "Kaydet": tüm bölgeler, sitedeki sırayla (ya hepsi ya hiçbiri). */
    saveZonesBulk: async (zones: (DeliveryZoneInput & { id: string })[]) => {
        const response = await api.put<DeliveryZone[]>('/delivery-zones/bulk', { zones });
        return response.data;
    },
    reorderZones: async (zoneIds: string[]) => {
        const response = await api.put<DeliveryZone[]>('/delivery-zones/order', { zoneIds });
        return response.data;
    },
    getBlockedPhones: async () => {
        const response = await api.get<BlockedPhone[]>('/blocked-phones');
        return response.data;
    },
    blockPhone: async (phone: string, reason: string) => {
        const response = await api.post<BlockedPhone>('/blocked-phones', { phone, reason });
        return response.data;
    },
    unblockPhone: async (id: string) => {
        await api.delete(`/blocked-phones/${id}`);
    },
};
