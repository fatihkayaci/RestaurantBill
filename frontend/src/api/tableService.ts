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
    openTable: async (tableId: string) => {
        const response = await api.post(`/table/${tableId}/open`); 
        return response.data;
    },
    closeTable: async (tableId: string) => {
        const response = await api.post(`/table/${tableId}/close`); 
        return response.data;
    },
    reservationTable: async (tableId: string) => {
        const response = await api.post(`/table/${tableId}/reservation`); 
        return response.data;
    },
    cancelReservation: async (tableId: string) => {
        const response = await api.post(`/table/${tableId}/cancel-reservation`); 
        return response.data;
    },
};