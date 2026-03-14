import { api } from './axiosInstance';
import type { Table } from '../features/tables/types';

export const tableService = {
    getTables: async () => {
        const response = await api.get<Table[]>('/table'); 
        return response.data;
    },
    getTableById: async (tableId: string) => {
        const response = await api.get<Table>(`/table/${tableId}`); 
        return response.data;
    },
    changeTableStatus: async (tableId: string, status: number) => {
        const response = await api.patch(`/table/${tableId}`, { 
            status: status 
        }); 
        return response.data;
    },
};