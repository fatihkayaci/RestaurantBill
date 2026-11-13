import { api } from '@/lib/axiosInstance';
import type { OpenRegister, Shift, ShiftStartCandidate, ShiftSummary, ShiftTransaction } from '../types';

export const shiftService = {
    getAll: async (cashRegisterId?: string) => {
        const response = await api.get<Shift[]>('/shift', {
            params: cashRegisterId ? { cashRegisterId } : undefined,
        });
        return response.data;
    },
    approveDifference: async (shiftId: string) => {
        const response = await api.post(`/shift/${shiftId}/approve-difference`);
        return response.data;
    },
    approveOpeningDifference: async (shiftId: string) => {
        const response = await api.post(`/shift/${shiftId}/approve-opening-difference`);
        return response.data;
    },
    rejectDifference: async (shiftId: string, note?: string) => {
        const response = await api.post(`/shift/${shiftId}/reject-difference`, { Note: note });
        return response.data;
    },
    rejectOpeningDifference: async (shiftId: string, note?: string) => {
        const response = await api.post(`/shift/${shiftId}/reject-opening-difference`, { Note: note });
        return response.data;
    },
    getStartCandidates: async () => {
        const response = await api.get<ShiftStartCandidate[]>('/shift/start-candidates');
        return response.data;
    },
    /** Açık günü olan kasalar (garson ödeme alırken kasa seçer). */
    getOpenRegisters: async () => {
        const response = await api.get<OpenRegister[]>('/shift/open-registers');
        return response.data;
    },
    getMyCurrent: async () => {
        const response = await api.get<Shift>('/shift/my-current');
        return response.data;
    },
    getCurrent: async (cashRegisterId: string) => {
        const response = await api.get<Shift>(`/shift/current/${cashRegisterId}`);
        return response.data;
    },
    ensureOpen: async (cashRegisterId: string) => {
        const response = await api.post<Shift>('/shift/ensure-open', {
            CashRegisterId: cashRegisterId,
        });
        return response.data;
    },
    getById: async (shiftId: string) => {
        const response = await api.get<Shift>(`/shift/${shiftId}`);
        return response.data;
    },
    // countedBalance sadece kasanın önceki vardiyası sayılmadan kapandıysa gerekir.
    // forUserId: Admin/Owner bir kasiyer adına açar; kasiyer girişte kapı görmez.
    openShift: async (cashRegisterId: string, countedBalance?: number, forUserId?: string) => {
        const response = await api.post<Shift>('/shift/open', {
            CashRegisterId: cashRegisterId,
            CountedBalance: countedBalance,
            ForUserId: forUserId,
        });
        return response.data;
    },
    takeOver: async (cashRegisterId: string, countedBalance: number) => {
        const response = await api.post<Shift>('/shift/take-over', {
            CashRegisterId: cashRegisterId,
            CountedBalance: countedBalance,
        });
        return response.data;
    },
    getShiftSummary: async (shiftId: string) => {
        const response = await api.get<ShiftSummary>(`/shift/${shiftId}/summary`);
        return response.data;
    },
    getShiftTransactions: async (shiftId: string) => {
        const response = await api.get<ShiftTransaction[]>(`/shift/${shiftId}/transactions`);
        return response.data;
    },
    closeShift: async (shiftId: string, countedClosingBalance: number, note?: string) => {
        const response = await api.post<Shift>('/shift/close', {
            ShiftId: shiftId,
            CountedClosingBalance: countedClosingBalance,
            Note: note,
        });
        return response.data;
    },
    closeShiftWithoutCount: async (shiftId: string) => {
        const response = await api.post(`/shift/${shiftId}/close-without-count`);
        return response.data;
    },
    applyLateCount: async (shiftId: string, countedClosingBalance: number, note?: string) => {
        const response = await api.post(`/shift/${shiftId}/apply-late-count`, {
            CountedClosingBalance: countedClosingBalance,
            Note: note,
        });
        return response.data;
    },
};
