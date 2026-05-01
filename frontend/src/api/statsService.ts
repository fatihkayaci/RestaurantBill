import { api } from './axiosInstance';
import type { OverviewStats } from '../features/stats/types';

export const statsService = {
    getOverview: async () => {
        const response = await api.get<OverviewStats>('/stats/overview');
        return response.data;
    },
};
