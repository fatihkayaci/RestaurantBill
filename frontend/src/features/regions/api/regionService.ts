import { api } from '@/lib/axiosInstance';
import type { Region } from '../types';

export const regionService = {
    getRegions: async () => {
        const response = await api.get<Region[]>('/region');
        return response.data;
    },
    createRegion: async (name: string) => {
        await api.post('/region/create', {
            Name: name
        });
    },
    updateRegion: async (id: number, name: string) => {
        await api.post('/region/update', {
            Id: id,
            Name: name
        });
    },
    deleteRegion: async (id: number) => {
        await api.delete(`/region/${id}`);
    },
};
