import { api } from '@/lib/axiosInstance';
import type { Table, Reservation, BulkCreateTablesResult } from '../types';
import type { Order } from '@/features/orders/types';

export const tableService = {
    getTables: async () => {
        const response = await api.get<Table[]>('/table');
        return response.data;
    },
    getTableById: async (tableId: string) => {
        const response = await api.get<Table>(`/table/${tableId}`);
        return response.data;
    },
    /** Bir bölgedeki masaların sırası: ilk id garson, kasa ve yönetici ekranlarında ilk görünür. */
    reorderTables: async (regionId: string, orderedTableIds: string[]) => {
        await api.post('/table/reorder', { RegionId: regionId, OrderedTableIds: orderedTableIds });
    },
    deleteTable: async (id: string) => {
        await api.delete(`/table/${id}`);
    },
    createTable: async (name: string, regionId: string, capacity?: number | null) => {
        const response = await api.post(`/table/create`, {
            Name: name,
            RegionId: regionId,
            Capacity: capacity ?? null
        });
        return response.data;
    },
    bulkCreateTables: async (regionId: string, prefix: string, startNumber: number, count: number) => {
        const response = await api.post<BulkCreateTablesResult>(`/table/bulk`, {
            RegionId: regionId,
            Prefix: prefix,
            StartNumber: startNumber,
            Count: count
        });
        return response.data;
    },
    /** capacity gönderilmezse (null) masanın kapasitesi temizlenir. */
    updateTable: async (id: string, name: string, regionId: string, status?: number, capacity?: number | null) => {
        const response = await api.post(`/table/update`, {
            Id: id,
            Name: name,
            Status: status,
            RegionId: regionId,
            Capacity: capacity ?? null
        });
        return response.data;
    },
    /** Masayı açar ve masanın aktif siparişinin kimliğini döner (masa zaten açıksa mevcut sipariş). */
    openTable: async (tableId: string) => {
        const response = await api.post<Order['id']>(`/table/open`, {
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
    /** "QR siparişi: Açık / Kilitli". Owner/Admin; garson yalnız "QR siparişini kilitleme" yetkisiyle. */
    setQrLock: async (tableId: string, locked: boolean) => {
        await api.post(`/table/${tableId}/qr-lock`, { locked });
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
