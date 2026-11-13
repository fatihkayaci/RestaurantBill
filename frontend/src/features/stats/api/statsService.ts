import { api } from '@/lib/axiosInstance';
import type { DashboardCardId, DashboardStats, OverviewStats, OwnerDashboardStats } from '../types';

export const statsService = {
    getDashboard: async () => {
        const response = await api.get<DashboardStats>('/stats/dashboard');
        return response.data;
    },
    getDashboardLayout: async () => {
        const response = await api.get<DashboardCardId[]>('/stats/dashboard-layout');
        return response.data;
    },
    /** null: varsayılan düzene dön. */
    saveDashboardLayout: async (cards: DashboardCardId[] | null) => {
        const response = await api.put<DashboardCardId[]>('/stats/dashboard-layout', { cards });
        return response.data;
    },
    getOverview: async () => {
        const response = await api.get<OverviewStats>('/stats/overview');
        return response.data;
    },
    getOwnerDashboard: async (params: { date?: string; trendDays?: 7 | 30 | 90 } = {}) => {
        const response = await api.get<OwnerDashboardStats>('/stats/owner-dashboard', { params });
        return response.data;
    },
};
