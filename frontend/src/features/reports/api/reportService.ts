import { api } from '@/lib/axiosInstance';
import type { ReportFilterParams, SalesReport, ShiftReport } from '../types';

export const reportService = {
    getSalesReport: async (filter: ReportFilterParams) => {
        const response = await api.get<SalesReport>('/reports/sales', {
            params: { from: filter.from, to: filter.to, branchId: filter.branchId },
        });
        return response.data;
    },
    getShiftReport: async (filter: ReportFilterParams) => {
        const response = await api.get<ShiftReport>('/reports/shifts', {
            params: { from: filter.from, to: filter.to, branchId: filter.branchId },
        });
        return response.data;
    },
};
