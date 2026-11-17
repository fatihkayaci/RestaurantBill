import type { PublicProduct, PublicSite } from '@/features/customerSite/types';

// Sitenin görsel seçimleri: kolaj fotoğrafları ve öne çıkan ürünler.

export interface HeroPhoto { url: string; isStock: boolean; alt: string }

/** Kapak fotoğrafı yoksa kolaj için menüdeki fotoğraflar (restoranın kendi fotoğrafları önce, hazır görseller sonra). */
export function collagePhotos(site: PublicSite, count = 6): HeroPhoto[] {
    const products = site.categories.flatMap(c => c.products).filter(p => p.imageUrl);
    const own = products.filter(p => !p.isStockImage);
    const stock = products.filter(p => p.isStockImage);
    const gallery = site.site.galleryImageUrls.map(url => ({ url, isStock: false, alt: '' }));
    return [...gallery, ...[...own, ...stock].map(p => ({ url: p.imageUrl, isStock: p.isStockImage, alt: p.name }))].slice(0, count);
}

/**
 * Öne çıkan ürünler: restoranın "Ustanın seçimi" işaretledikleri; hiç işaret yoksa fotoğraflı ilk ürünler.
 * `photoOnly`: yalnız fotoğraflılar (büyük görsel kartları için).
 */
export function pickFeatured(products: PublicProduct[], count: number, photoOnly = false): PublicProduct[] {
    const pool = photoOnly ? products.filter(p => p.imageUrl) : products;
    const featured = pool.filter(p => p.isFeatured);
    const rest = pool.filter(p => !p.isFeatured).sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)));
    return [...featured, ...rest].slice(0, count);
}
