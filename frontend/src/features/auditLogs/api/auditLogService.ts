import { api } from '@/lib/axiosInstance';
import type { AuditLog } from '../types';

export const auditLogService = {
    getAll: async () => {
        const response = await api.get<AuditLog[]>('/auditlog');
        return response.data;
    },
};
