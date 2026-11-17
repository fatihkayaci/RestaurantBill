import type { SiteChecklistItem, SiteCompleteness } from '@/features/customerSite/types';

// "Sitenizi güzelleştirin": Genel Bakış kartı ve site düzenleyicisinin rehber şeridi aynı listeyi ve sırayı kullanır
// (sunucu maddeleri görsel etkisine göre sıralar; burada yalnız eksikler ve eylem cümleleri).

export const SITE_SETTINGS_PATH = '/admin/site';

/** Eksik maddeler, en çok fark yaratan önce. */
export function missingItems(data: SiteCompleteness): SiteChecklistItem[] {
    return data.items.filter(i => !i.done);
}

/** Tamamlanan / toplam: "6/16". */
export function doneCount(data: SiteCompleteness): { done: number; total: number } {
    return { done: data.items.length - missingItems(data).length, total: data.items.length };
}

const ACTIONS: Record<string, string> = {
    cover: 'Kapak fotoğrafı ekleyin',
    productPhotos: 'Ürünlere fotoğraf ekleyin',
    gallery: 'Mekân fotoğrafı ekleyin',
    story: 'Hikâyenizi yazın',
    hours: 'Çalışma saatlerini girin',
    aboutPhoto: 'Hikâye fotoğrafı ekleyin',
    rating: 'Google puanını ekleyin',
    whatsapp: 'WhatsApp numarası ekleyin',
    founder: 'Ustanızı tanıtın',
    reviews: 'Misafir yorumu ekleyin',
    directions: '“Nasıl gelinir” yazın',
    amenities: 'Olanakları seçin',
    regions: 'Bölüm fotoğrafı ekleyin',
    values: 'Değerlerinizi yazın',
    history: 'Kuruluş yılını girin',
    instagram: 'Instagram ekleyin',
};

/** Maddenin kısa eylem cümlesi ("Google puanını ekleyin"); bilinmeyen maddede başlığı. */
export function itemAction(item: SiteChecklistItem): string {
    return ACTIONS[item.key] ?? item.title;
}
