import { api } from '@/lib/axiosInstance';
import type { AddSetMenuToOrder, SetMenu, SetMenuInput } from '../types';

export const setMenuService = {
    /** Şubenin menüleri (pasifler dahil), maliyetsiz. Owner, Admin ve Garson çağırabilir. */
    getSetMenus: async () => {
        const response = await api.get<SetMenu[]>('/set-menu');
        return response.data;
    },
    /** Maliyet ve tahmini menü maliyeti dahil; yalnızca Admin/Owner. */
    getSetMenusWithCost: async () => {
        const response = await api.get<SetMenu[]>('/set-menu/with-cost');
        return response.data;
    },
    /** Yeni menünün Id'sini döner (görsel yüklemek için). */
    createSetMenu: async (input: SetMenuInput) => {
        const response = await api.post<string>('/set-menu', input);
        return response.data;
    },
    updateSetMenu: async (id: string, input: SetMenuInput) => {
        await api.put(`/set-menu/${id}`, input);
    },
    deleteSetMenu: async (id: string) => {
        await api.delete(`/set-menu/${id}`);
    },
    uploadSetMenuImage: async (id: string, file: Blob, fileName = 'crop.jpg') => {
        const formData = new FormData();
        formData.append('file', file, fileName);
        const response = await api.post<string>(`/set-menu/${id}/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000
        });
        return response.data;
    },
    /** Siparişe menü ekler; fiyat sunucuda hesaplanır. Yeni menü satırının Id'sini döner. */
    addSetMenuToOrder: async (body: AddSetMenuToOrder) => {
        const response = await api.post<string>('/order/add-set-menu', body);
        return response.data;
    },
};
