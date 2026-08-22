import { api } from '@/lib/axiosInstance';
import type { AuditLog, PagedResult } from '../types';

export interface AuditLogFilters {
    pageNumber: number;
    pageSize: number;
    search?: string;
    category?: number;
    severity?: number;
    branchId?: string;
    actorName?: string;
    dateFrom?: string;
    dateTo?: string;
}

export const auditLogService = {
    getAll: async (filters: AuditLogFilters) => {
        const response = await api.get<PagedResult<AuditLog>>('/auditlog', { params: filters });
        return response.data;
    },
    getActors: async () => {
        const response = await api.get<string[]>('/auditlog/actors');
        return response.data;
    },
};
