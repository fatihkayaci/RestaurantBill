import { api } from '@/lib/axiosInstance';
import type { CurrentShift, Shift, ShiftStartCandidate, ShiftSummary, ShiftTransaction } from '../types';

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
    getStartCandidates: async () => {
        const response = await api.get<ShiftStartCandidate[]>('/shift/start-candidates');
        return response.data;
    },
    getMyCurrent: async () => {
        const response = await api.get<CurrentShift>('/shift/my-current');
        return response.data;
    },
    openShift: async (cashRegisterId: string, openingBalance: number) => {
        const response = await api.post('/shift/open', {
            CashRegisterId: cashRegisterId,
            OpeningBalance: openingBalance,
        });
        return response.data;
    },
    getMyCurrentSummary: async () => {
        const response = await api.get<ShiftSummary>('/shift/my-current-summary');
        return response.data;
    },
    getMyCurrentTransactions: async () => {
        const response = await api.get<ShiftTransaction[]>('/shift/my-current-transactions');
        return response.data;
    },
    closeShift: async (shiftId: string, countedClosingBalance: number, note?: string) => {
        const response = await api.post('/shift/close', {
            ShiftId: shiftId,
            CountedClosingBalance: countedClosingBalance,
            Note: note,
        });
        return response.data;
    },
};
