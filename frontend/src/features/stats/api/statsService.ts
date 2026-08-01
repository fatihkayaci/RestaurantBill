import { api } from '@/lib/axiosInstance';
import type { OverviewStats } from '../types';

export const statsService = {
    getOverview: async () => {
        const response = await api.get<OverviewStats>('/stats/overview');
        return response.data;
    },
};
