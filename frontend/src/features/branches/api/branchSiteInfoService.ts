import { api } from '@/lib/axiosInstance';
import type { SiteDayHours } from '@/features/customerSite/types';

// Restoran sitesinin şubeye ait bilgileri: çalışma saatleri, saat notu, WhatsApp, "nasıl gelinir". Site şirket genelidir
// (sahip /owner/site'tan düzenler); bunlar oturumdaki şubenindir ve taslaksız, hemen kaydedilir.
// Uçlar: GET / PUT api/branch/site-info.

export interface BranchSiteInfo {
    /** "HH:mm" ya da null: her gün aynı aralık (haftalık saat girildiyse en sık aralık). */
    opensAt: string | null;
    closesAt: string | null;
    hoursNote: string;
    /** Boş: "her gün aynı". Doluysa Pazartesi → Pazar 7 gün. */
    weeklyHours: SiteDayHours[];
    whatsappPhone: string;
    directionsNote: string;
}

export const branchSiteInfoService = {
    get: async () => (await api.get<BranchSiteInfo>('/branch/site-info')).data,
    update: async (info: BranchSiteInfo) => (await api.put<BranchSiteInfo>('/branch/site-info', info)).data,
};
