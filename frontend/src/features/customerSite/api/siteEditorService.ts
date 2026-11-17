import { isAxiosError } from 'axios';
import { api } from '@/lib/axiosInstance';
import type { BranchSite, SiteEditor } from '../types';

// Görsel site düzenleyicisi (Taslak + Yayınla). Sözleşme: docs/site-editor.md.
// Sürüm taşıyan uçlar (kaydet, geri al, yayınla, at) eski sürümde 409 { error, editor } döner: SiteDraftConflictError.
// Fotoğraf uçları sürüm denetlemez ama sürümü artırır; çağıran bütün yazmaları sırayla yapmalıdır.

/** `cover` kapak, `about` hikâye, `founder` usta portresi, `share` paylaşım görseli, `hero-*` alt sayfa kapakları. */
export type SiteDraftImageSlot = 'cover' | 'about' | 'founder' | 'share'
    | 'hero-menu' | 'hero-hakkimizda' | 'hero-mekan' | 'hero-iletisim' | 'hero-rezervasyon';

/** Taslağın metin alanları: PUT tam yazımdır, hepsi gönderilir. Fotoğraflar ayrı uçlardan değişir. */
export type SiteDraftTexts = Omit<BranchSite,
    'coverImageUrl' | 'aboutImageUrl' | 'founderPhotoUrl' | 'galleryImageUrls' | 'shareImageUrl' | 'regionDetails'
    | 'menuHeroUrl' | 'aboutHeroUrl' | 'venueHeroUrl' | 'contactHeroUrl' | 'reservationHeroUrl'> & {
    /** Yalnız regionId + description okunur. */
    regionDetails: { regionId: string; description: string }[];
};

export class SiteDraftConflictError extends Error {
    readonly editor: SiteEditor;
    constructor(message: string, editor: SiteEditor) {
        super(message);
        this.editor = editor;
    }
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 };
const BASE = '/branch/site/draft';

function fileForm(file: File): FormData {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return formData;
}

/** 409'u (sürüm eski) gövdesindeki güncel düzenleyiciyle birlikte SiteDraftConflictError'a çevirir. */
async function versioned(call: () => Promise<{ data: SiteEditor }>): Promise<SiteEditor> {
    try {
        return (await call()).data;
    } catch (err) {
        if (isAxiosError<{ error?: string; editor?: SiteEditor }>(err) && err.response?.status === 409 && err.response.data?.editor) {
            throw new SiteDraftConflictError(err.response.data.error ?? 'Site başka bir oturumda da düzenlendi.', err.response.data.editor);
        }
        throw err;
    }
}

const galleryQuery = (index?: number) => (index === undefined ? '' : `?index=${index}`);

export const siteEditorService = {
    get: async () => (await api.get<SiteEditor>(BASE)).data,
    save: (version: number, texts: SiteDraftTexts) => versioned(() => api.put<SiteEditor>(BASE, { ...texts, version })),
    revert: (version: number, fields: string[]) => versioned(() => api.post<SiteEditor>(`${BASE}/revert`, { version, fields })),
    publish: (version: number) => versioned(() => api.post<SiteEditor>(`${BASE}/publish`, { version })),
    discard: (version: number) => versioned(() => api.post<SiteEditor>(`${BASE}/discard`, { version })),

    uploadImage: async (slot: SiteDraftImageSlot, file: File) =>
        (await api.post<SiteEditor>(`${BASE}/image/${slot}`, fileForm(file), multipart)).data,
    selectStockImage: async (slot: SiteDraftImageSlot, stockImageId: string) =>
        (await api.post<SiteEditor>(`${BASE}/image/${slot}/stock`, { stockImageId })).data,
    removeImage: async (slot: SiteDraftImageSlot) => (await api.delete<SiteEditor>(`${BASE}/image/${slot}`)).data,

    /** index verilirse o sıradaki fotoğraf değişir; yoksa sona eklenir (en çok 12). */
    uploadGalleryImage: async (file: File, index?: number) =>
        (await api.post<SiteEditor>(`${BASE}/gallery${galleryQuery(index)}`, fileForm(file), multipart)).data,
    selectGalleryStockImage: async (stockImageId: string, index?: number) =>
        (await api.post<SiteEditor>(`${BASE}/gallery/stock${galleryQuery(index)}`, { stockImageId })).data,
    removeGalleryImage: async (index: number) => (await api.delete<SiteEditor>(`${BASE}/gallery/${index}`)).data,
    /** order: mevcut sıraların yeni dizilişi, ör. [2, 0, 1]. */
    reorderGallery: async (order: number[]) => (await api.put<SiteEditor>(`${BASE}/gallery/order`, { order })).data,

    uploadRegionImage: async (regionId: string, file: File) =>
        (await api.post<SiteEditor>(`${BASE}/regions/${regionId}/image`, fileForm(file), multipart)).data,
    selectRegionStockImage: async (regionId: string, stockImageId: string) =>
        (await api.post<SiteEditor>(`${BASE}/regions/${regionId}/image/stock`, { stockImageId })).data,
    removeRegionImage: async (regionId: string) => (await api.delete<SiteEditor>(`${BASE}/regions/${regionId}/image`)).data,
};
