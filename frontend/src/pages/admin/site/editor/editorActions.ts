import { siteEditorService, type SiteDraftImageSlot, type SiteDraftTexts } from '@/features/customerSite/api/siteEditorService';
import type { PublicSite, SiteEditor } from '@/features/customerSite/types';
import type { StockImage } from '@/features/stockImages/api/stockImageService';
import { SITE_LIMITS, type SiteEditTarget, type SiteTextField } from '@/pages/public/site/siteEditContext';
import { PHOTO_META, slotUrl } from './editorModel';
import type { SiteEditorState } from './useSiteEditor';

// Düzenleyicinin işlemleri: pencerelerin ortak bağlamı ve fotoğraf hedeflerinin (kapaklar, galeri, bölüm) sunucu çağrıları.

export interface EditorCtx {
    editor: SiteEditor;
    texts: SiteDraftTexts;
    site: PublicSite;
    state: SiteEditorState;
    select: (target: SiteEditTarget | null) => void;
    openAdmin: (path: string) => void;
    /** Hazır görsel katmanını bu fotoğraf hedefi için açar. */
    openStock: (target: SiteEditTarget) => void;
    focusText: (field: SiteTextField) => void;
}

export interface PhotoTarget {
    title: string;
    hint: string;
    /** Şu an görünen (yoksa boş). */
    current: string;
    /** Bu yuvaya ait bir fotoğraf var mı ("Kaldır" yalnız o zaman). */
    hasOwn: boolean;
    removeLabel: string;
    busyKey: string;
    markLabel: string;
    multiple?: boolean;
    upload: (files: File[]) => Promise<unknown>;
    /** Hazır görsel seçimi; yoksa (ekip portresi) "Hazır görsellerden seç" gösterilmez. */
    stock?: (image: StockImage) => Promise<unknown>;
    remove?: () => Promise<unknown>;
    move?: (dir: -1 | 1) => Promise<unknown>;
    canMove?: { left: boolean; right: boolean };
}

/** Hedefin (photo:…, gallery:…, region:…) fotoğraf işlemleri; tanınmazsa null. */
export function photoTarget(ctx: EditorCtx, target: SiteEditTarget): PhotoTarget | null {
    const d = ctx.editor.draft;
    const run = ctx.state.runPhoto;
    if (target.startsWith('photo:team:')) {
        // Ekip portresi: yalnız kendi fotoğrafı (hazır görsel yok). Üye önce adıyla kaydedilmiş olmalı (runPhoto önce yazıları kaydeder).
        const id = target.slice(11);
        const member = ctx.texts.teamMembers.find(m => m.id === id);
        if (!member) return null;
        const own = d.teamMembers?.find(m => m.id === id)?.photoUrl ?? '';
        return {
            title: member.name ? `Ekip portresi · ${member.name}` : 'Ekip portresi',
            hint: member.name ? 'Dikey, yüzü net bir fotoğraf. Kişinin kendi fotoğrafı olmalı.' : 'Önce kartın üstünde adını yazın, sonra fotoğrafını yükleyin.',
            current: own, hasOwn: Boolean(own), removeLabel: 'Fotoğrafı kaldır', busyKey: target, markLabel: 'Kullanılıyor',
            upload: files => run(target, () => siteEditorService.uploadTeamImage(id, files[0]), 'Fotoğraf yüklenemedi.'),
            remove: () => run(target, () => siteEditorService.removeTeamImage(id), 'Fotoğraf kaldırılamadı.'),
        };
    }
    if (target.startsWith('photo:')) {
        const slot = target.slice(6) as SiteDraftImageSlot;
        const meta = PHOTO_META[slot];
        if (!meta) return null;
        const own = slotUrl(d, slot);
        return {
            title: meta.title, hint: meta.hint, current: own, hasOwn: Boolean(own), removeLabel: meta.removeLabel, busyKey: target,
            markLabel: 'Kullanılıyor',
            upload: files => run(target, () => siteEditorService.uploadImage(slot, files[0]), 'Fotoğraf yüklenemedi.'),
            stock: image => run(target, () => siteEditorService.selectStockImage(slot, image.id)),
            remove: () => run(target, () => siteEditorService.removeImage(slot), 'Fotoğraf kaldırılamadı.'),
        };
    }
    if (target === 'gallery:add') {
        const count = d.galleryImageUrls.length;
        return {
            title: 'Mekân fotoğrafı ekle', hint: `Galeri ${count} / ${SITE_LIMITS.gallery}. İlk fotoğraf galerinin büyük karesidir; birden fazla seçebilirsiniz.`,
            current: '', hasOwn: false, removeLabel: '', busyKey: 'gallery', markLabel: 'Galeride', multiple: true,
            upload: async files => {
                for (const file of files.slice(0, SITE_LIMITS.gallery - count)) {
                    if (!(await run('gallery', () => siteEditorService.uploadGalleryImage(file), 'Fotoğraf yüklenemedi.'))) break;
                }
            },
            stock: image => run('gallery', () => siteEditorService.selectGalleryStockImage(image.id)),
        };
    }
    if (target.startsWith('gallery:')) {
        const index = Number(target.slice(8));
        const urls = d.galleryImageUrls;
        if (!(index >= 0 && index < urls.length)) return null;
        const reorder = (dir: -1 | 1) => {
            const order = urls.map((_, i) => i);
            [order[index], order[index + dir]] = [order[index + dir], order[index]];
            return run('gallery', () => siteEditorService.reorderGallery(order), 'Sıra değiştirilemedi.');
        };
        return {
            title: `Mekân fotoğrafı ${index + 1}`, hint: index === 0 ? 'Galerinin büyük karesi.' : 'Mekân galerisi ve anasayfa fotoğraf şeridi.',
            current: urls[index], hasOwn: true, removeLabel: 'Galeriden kaldır', busyKey: 'gallery', markLabel: 'Bu karede',
            upload: files => run('gallery', () => siteEditorService.uploadGalleryImage(files[0], index), 'Fotoğraf yüklenemedi.'),
            stock: image => run('gallery', () => siteEditorService.selectGalleryStockImage(image.id, index)),
            remove: () => run('gallery', () => siteEditorService.removeGalleryImage(index), 'Fotoğraf kaldırılamadı.'),
            move: reorder,
            canMove: { left: index > 0, right: index < urls.length - 1 },
        };
    }
    if (target.startsWith('region:')) {
        const id = target.slice(7);
        const region = d.regionDetails.find(r => r.regionId === id);
        if (!region) return null;
        return {
            title: `Bölüm · ${region.name}`, hint: 'Yatay, bölümün tamamını gösteren bir fotoğraf. Açıklamayı kartın üstünde yazın.',
            current: region.photoUrl, hasOwn: Boolean(region.photoUrl), removeLabel: 'Kaldır', busyKey: target, markLabel: 'Bölümde',
            upload: files => run(target, () => siteEditorService.uploadRegionImage(id, files[0]), 'Fotoğraf yüklenemedi.'),
            stock: image => run(target, () => siteEditorService.selectRegionStockImage(id, image.id)),
            remove: () => run(target, () => siteEditorService.removeRegionImage(id), 'Fotoğraf kaldırılamadı.'),
        };
    }
    return null;
}
