import { api } from '@/lib/axiosInstance';
import type { QrFeatures } from '@/features/customerSite/types';

// Admin "QR menü özellikleri": oturumdaki şubenin masa QR karşılama ekranı anahtarları.
export const qrFeaturesService = {
    get: async () => {
        const response = await api.get<QrFeatures>('/branch/qr-features');
        return response.data;
    },
    update: async (features: QrFeatures) => {
        const response = await api.put<QrFeatures>('/branch/qr-features', features);
        return response.data;
    },
};
