import { api } from './axiosInstance';
import type { Table } from '../features/tables/types';

export const tableService = {
    getTables: async () => {
        const response = await api.get<Table[]>('/table'); 
        return response.data;
    }
};