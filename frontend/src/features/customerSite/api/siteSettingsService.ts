import { api } from '@/lib/axiosInstance';
import type { SiteCompleteness } from '../types';

// "Sitenizi güzelleştirin" puanı. Sitenin içeriği görsel düzenleyiciden değişir: siteEditorService.ts.
export const siteSettingsService = {
    /** Doluluk puanı ve yapılacaklar; `draft`: taslağa göre (site düzenleyicisi), yoksa yayındaki siteye göre. */
    getCompleteness: async (draft = false) => {
        const response = await api.get<SiteCompleteness>('/company/site/completeness', { params: draft ? { draft: true } : undefined });
        return response.data;
    },
};
