import { api } from '@/lib/axiosInstance';
import type { CashRegister, CashRegisterStatus, CashTransaction, CashTransactionType } from '../types';

export const cashRegisterService = {
    getCashRegisters: async () => {
        const response = await api.get<CashRegister[]>('/cashregister');
        return response.data;
    },
    getCashRegisterById: async (id: number) => {
        const response = await api.get<CashRegister>(`/cashregister/${id}`);
        return response.data;
    },
    getTransactions: async () => {
        const response = await api.get<CashTransaction[]>('/cashregister/transactions');
        return response.data;
    },
    createCashRegister: async (name: string, openingBalance: number, status: CashRegisterStatus) => {
        const response = await api.post('/cashregister/create', {
            Name: name,
            OpeningBalance: openingBalance,
            Status: status,
        });
        return response.data;
    },
    updateCashRegister: async (id: number, name: string, balance: number, status: CashRegisterStatus) => {
        const response = await api.post('/cashregister/update', {
            Id: id,
            Name: name,
            Balance: balance,
            Status: status,
        });
        return response.data;
    },
    deleteCashRegister: async (id: number) => {
        await api.delete(`/cashregister/${id}`);
    },
    addTransaction: async (cashRegisterId: number, type: CashTransactionType, amount: number) => {
        const response = await api.post('/cashregister/transaction', {
            CashRegisterId: cashRegisterId,
            Type: type,
            Amount: amount,
        });
        return response.data;
    },
};
