import { api } from '@/lib/axiosInstance';
import type { Table, Reservation } from '../types';

export const tableService = {
    getTables: async () => {
        const response = await api.get<Table[]>('/table');
        return response.data;
    },
    getTableById: async (tableId: string) => {
        const response = await api.get<Table>(`/table/${tableId}`);
        return response.data;
    },
    deleteTable: async (id: string) => {
        await api.delete(`/table/${id}`);
    },
    createTable: async (name: string, regionId: string) => {
        const response = await api.post(`/table/create`, {
            Name: name,
            RegionId: regionId
        });
        return response.data;
    },
    updateTable: async (id: string, name: string, regionId: string, status?: number) => {
        const response = await api.post(`/table/update`, {
            Id: id,
            Name: name,
            Status: status,
            RegionId: regionId
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
    reservationTable: async (tableId: string, guestName: string, contact: string, reservationTime: string, note: string) => {
        const response = await api.post(`/table/reservation`, {
            TableId: tableId,
            GuestName: guestName,
            Contact: contact,
            ReservationTime: reservationTime,
            Note: note
        });
        return response.data;
    },
    getActiveReservation: async (tableId: string) => {
        const response = await api.get<Reservation | null>(`/table/${tableId}/reservation`);
        return response.data;
    },
    cancelReservation: async (tableId: string) => {
        const response = await api.post(`/table/cancel-reservation`, {
            TableId: tableId
        });
        return response.data;
    },
};
