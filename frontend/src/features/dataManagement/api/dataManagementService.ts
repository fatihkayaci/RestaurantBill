import { isAxiosError } from 'axios';
import { api } from '@/lib/axiosInstance';
import type {
    ClosurePreview, ClosureStatus, Confirmation, DataOverview, DataSelection, DeletionPreview, ResetPreview,
} from '../types';

// Silme ve indirme büyük şubede birkaç saniyeyi aşabilir; genel 5 sn sınırı burada geçerli değil.
const LONG = { timeout: 120_000 };

export const dataManagementService = {
    overview: async (): Promise<DataOverview> => (await api.get<DataOverview>('/company/data')).data,

    previewDelete: async (selection: DataSelection): Promise<DeletionPreview> =>
        (await api.post<DeletionPreview>('/company/data/delete/preview', selection, LONG)).data,

    delete: async (selection: DataSelection, confirmation: Confirmation): Promise<DeletionPreview> =>
        (await api.post<DeletionPreview>('/company/data/delete', { ...selection, ...confirmation }, LONG)).data,

    previewReset: async (branchIds: string[], items: string[]): Promise<ResetPreview> =>
        (await api.post<ResetPreview>('/company/data/reset/preview', { branchIds, items })).data,

    reset: async (branchIds: string[], items: string[], confirmation: Confirmation): Promise<ResetPreview> =>
        (await api.post<ResetPreview>('/company/data/reset', { branchIds, items, ...confirmation }, LONG)).data,

    /** Seçilen geçmiş gruplarını ZIP (grup başına CSV) olarak indirir. */
    exportCsv: async (selection: DataSelection): Promise<void> => {
        let response;
        try {
            response = await api.post<Blob>('/company/data/export', selection, { ...LONG, responseType: 'blob' });
        } catch (err) {
            // Hata gövdesi de blob gelir; getApiErrorMessage okuyabilsin diye JSON'a çevrilir.
            if (isAxiosError(err) && err.response?.data instanceof Blob) {
                try { err.response.data = JSON.parse(await err.response.data.text()); } catch { /* metin değil */ }
            }
            throw err;
        }
        const disposition = String(response.headers['content-disposition'] ?? '');
        const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
        const fileName = match ? decodeURIComponent(match[1]) : 'restoran-verileri.zip';
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    },

    closureStatus: async (): Promise<ClosureStatus> => (await api.get<ClosureStatus>('/company/closure')).data,

    previewClosure: async (): Promise<ClosurePreview> =>
        (await api.post<ClosurePreview>('/company/closure/preview', null, LONG)).data,

    close: async (confirmation: Confirmation): Promise<ClosureStatus> =>
        (await api.post<ClosureStatus>('/company/closure', confirmation)).data,

    cancelClosure: async (): Promise<ClosureStatus> =>
        (await api.post<ClosureStatus>('/company/closure/cancel')).data,
};
