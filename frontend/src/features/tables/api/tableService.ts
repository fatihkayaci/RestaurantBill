import { api } from '@/lib/axiosInstance';
import type { Table } from '../types';

export const tableService = {
    getTables: async () => {
        const response = await api.get<Table[]>('/table');
        return response.data;
    },
    getTableById: async (tableId: string) => {
        const response = await api.get<Table>(`/table/${tableId}`);
        return response.data;
    },
    deleteTable: async (id: number) => {
        await api.delete(`/table/${id}`);
    },
    createTable: async (name: string) => {
        const response = await api.post(`/table/create`, {
            Name: name
        });
        return response.data;
    },
    updateTable: async (id: number, name: string, status?: number) => {
        const response = await api.post(`/table/update`, {
            Id: id,
            Name: name,
            Status: status
        });
        return response.data;
    },
    openTable: async (tableId: string) => {
        const response = await api.post(`/table/open`, {
            TableId: tableId
        });
        return response.data;
    },
    closeTable: async (tableId: string) => {
        const response = await api.post(`/table/close`, {
            TableId: tableId
        });
        return response.data;
    },
    reservationTable: async (tableId: string) => {
        const response = await api.post(`/table/reservation`, {
            TableId: tableId
        });
        return response.data;
    },
    cancelReservation: async (tableId: string) => {
        const response = await api.post(`/table/cancel-reservation`, {
            TableId: tableId
        });
        return response.data;
    },
};
