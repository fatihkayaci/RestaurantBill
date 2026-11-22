import type { PublicSite, SiteHomeSection } from '@/features/customerSite/types';
import { teamOnSite } from './siteParts';
import { fullAddress } from './useSite';

// Anasayfanın sıralanıp gizlenebilen bölümleri (Sophra tasarımı; backend: SiteContent.HomeSectionKeys). Kapak ve alt bilgi
// sabittir. Restoran bölümü kapatabilir ve sırasını değiştirebilir; içeriği olmayan bölüm açık olsa da çizilmez (boşluk
// kalmaz). Admin düzenleyicisi ("Anasayfa bölümleri") ve site aynı listeyi ve aynı "içerik var mı" kuralını kullanır.

export const HOME_SECTION_KEYS = ['categories', 'featured', 'about', 'team', 'features', 'gallery', 'reviews', 'contact'] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

/** Varsayılanı kapalı bölümler (backend: SiteContent.HomeSectionsOffByDefault): restoran açarsa görünür. */
export const HOME_SECTIONS_OFF_BY_DEFAULT: readonly HomeSectionKey[] = ['team'];

export const HOME_SECTION_INFO: Record<HomeSectionKey, { label: string; hint: string }> = {
    categories: { label: 'Menü kategorileri', hint: 'Kategoriler kart olarak; menüdeki ilgili bölüme götürür.' },
    featured: { label: 'Öne çıkan ürünler', hint: "Yemeklerimiz'de “öne çıkan” işaretli ürünler." },
    about: { label: 'Hakkımızda', hint: 'Hikâye fotoğrafı, başlığı ve metni.' },
    team: { label: 'Ekibimiz', hint: "Hakkımızda'daki ekip, tek sıra portre ve Hakkımızda bağlantısı." },
    features: { label: 'Değerler ve olanaklar', hint: 'Değerleriniz ve mekânın olanakları, simgeli kutucuklar.' },
    gallery: { label: 'Galeri ve Instagram', hint: 'Mekân fotoğrafları ve Instagram hesabınız.' },
    reviews: { label: 'Puan ve yorumlar', hint: 'Google puanınız ve seçtiğiniz misafir yorumları.' },
    contact: { label: 'İletişim ve konum', hint: 'Adres, telefon, saatler, harita ve yol tarifi.' },
};

export function isHomeSectionKey(key: string): key is HomeSectionKey {
    return (HOME_SECTION_KEYS as readonly string[]).includes(key);
}

/** Kaydedilmiş liste → tam liste: bilinmeyen ve tekrar eden anahtarlar atılır, eksikler varsayılan sırayla sona (açık;
 *  varsayılanı kapalı olan, ör. ekip, kapalı). Boş liste: varsayılan sıra. */
export function resolveHomeSections(saved: SiteHomeSection[] | null | undefined): { key: HomeSectionKey; enabled: boolean }[] {
    const result: { key: HomeSectionKey; enabled: boolean }[] = [];
    for (const s of saved ?? []) {
        if (isHomeSectionKey(s.key) && !result.some(r => r.key === s.key)) result.push({ key: s.key, enabled: s.enabled });
    }
    for (const key of HOME_SECTION_KEYS) {
        if (!result.some(r => r.key === key)) result.push({ key, enabled: !HOME_SECTIONS_OFF_BY_DEFAULT.includes(key) });
    }
    return result;
}

/** Ürünü olan kategoriler (kart sırasıyla). */
export function filledCategories(site: PublicSite) {
    return site.categories.filter(c => c.products.length > 0);
}

/** Öne çıkan ve tükenmemiş ürünler (menüdeki sırayla). */
export function featuredProducts(site: PublicSite) {
    return site.categories.flatMap(c => c.products.map(p => ({ product: p, categoryId: c.id }))).filter(x => x.product.isFeatured && !x.product.isOutOfStock);
}

/** Bölümün sitede gösterilecek içeriği var mı (yoksa açık olsa da çizilmez). */
export function homeSectionHasContent(site: PublicSite, key: HomeSectionKey): boolean {
    const c = site.site;
    switch (key) {
        case 'categories': return filledCategories(site).length > 0;
        case 'featured': return featuredProducts(site).length > 0;
        case 'about': return Boolean(c.about || c.storyTitle);
        case 'team': return teamOnSite(site).length > 0;
        case 'features': return c.values.length > 0 || c.amenities.length > 0;
        case 'gallery': return c.galleryImageUrls.length > 0 || Boolean(c.instagramUrl);
        case 'reviews': return c.rating !== null || c.featuredReviews.length > 0;
        case 'contact': return Boolean(fullAddress(site) || site.phone || c.whatsappPhone);
    }
}
