import { api } from '@/lib/axiosInstance';
import type { OverviewStats, OwnerDashboardStats } from '../types';

export const statsService = {
    getOverview: async () => {
        const response = await api.get<OverviewStats>('/stats/overview');
        return response.data;
    },
    getOwnerDashboard: async (params: { date?: string; trendDays?: 7 | 30 | 90 } = {}) => {
        const response = await api.get<OwnerDashboardStats>('/stats/owner-dashboard', { params });
        return response.data;
    },
};
