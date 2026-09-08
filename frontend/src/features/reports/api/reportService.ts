import { api } from '@/lib/axiosInstance';
import type { DiscountReport, ProductReport, ReportFilterParams, SalesReport, ShiftReport, StaffReport, TaxReport } from '../types';

const params = (filter: ReportFilterParams) => ({ from: filter.from, to: filter.to, branchId: filter.branchId });

export const reportService = {
    getSalesReport: async (filter: ReportFilterParams) => {
        const response = await api.get<SalesReport>('/reports/sales', { params: params(filter) });
        return response.data;
    },
    getShiftReport: async (filter: ReportFilterParams) => {
        const response = await api.get<ShiftReport>('/reports/shifts', { params: params(filter) });
        return response.data;
    },
    getProductReport: async (filter: ReportFilterParams) => {
        const response = await api.get<ProductReport>('/reports/products', { params: params(filter) });
        return response.data;
    },
    getStaffReport: async (filter: ReportFilterParams) => {
        const response = await api.get<StaffReport>('/reports/staff', { params: params(filter) });
        return response.data;
    },
    getDiscountReport: async (filter: ReportFilterParams) => {
        const response = await api.get<DiscountReport>('/reports/discounts', { params: params(filter) });
        return response.data;
    },
    getTaxReport: async (filter: ReportFilterParams) => {
        const response = await api.get<TaxReport>('/reports/tax', { params: params(filter) });
        return response.data;
    },
};
