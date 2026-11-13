import { api } from '@/lib/axiosInstance';
import type { ReservationRules } from '../types';

export type ReservationRulesInput = Omit<ReservationRules, 'isCustomized'>;

// Admin "Rezervasyon ayarları": oturumdaki şubenin rezervasyon kuralları.
export const reservationSettingsService = {
    get: async () => {
        const response = await api.get<ReservationRules>('/branch/reservation-settings');
        return response.data;
    },
    update: async (input: ReservationRulesInput) => {
        const response = await api.put<ReservationRules>('/branch/reservation-settings', input);
        return response.data;
    },
    resetToDefaults: async () => {
        const response = await api.put<ReservationRules>('/branch/reservation-settings', { resetToDefaults: true });
        return response.data;
    },
};
