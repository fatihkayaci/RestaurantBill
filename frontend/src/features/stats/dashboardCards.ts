import type { DashboardCardId } from './types';

// Genel Bakış kart kataloğu. Kimlikler backend'deki DashboardCards.All ile aynı olmalı; sıra varsayılan düzendir.
// span: 6 sütunlu masaüstü ızgarasında (md'de 2 sütun) kartın genişliği.
export const CARD_META: Record<DashboardCardId, { title: string; hint: string; span: string }> = {
    revenue: { title: 'Bugünün cirosu', hint: 'Nakit / kart, düne göre fark', span: 'lg:col-span-2' },
    live: { title: 'Şu an', hint: 'Dolu masa, açık sipariş, mutfak', span: 'lg:col-span-2' },
    pending: { title: 'Seni bekleyenler', hint: 'QR siparişi, rezervasyon isteği, sayım', span: 'lg:col-span-2' },
    overdue: { title: 'Geciken siparişler', hint: 'Hazırlanma süresini aşan ürünler', span: 'lg:col-span-2' },
    tables: { title: 'Masa durumu', hint: 'Bölge bölge canlı harita, açık kalma süresi', span: 'md:col-span-2 lg:col-span-6' },
    hourly: { title: 'Saatlik satış', hint: 'Bugün ve geçen haftanın aynı günü', span: 'md:col-span-2 lg:col-span-4' },
    reservations: { title: 'Bugünkü rezervasyonlar', hint: 'Saat, isim, durum', span: 'lg:col-span-2' },
    top: { title: 'En çok satanlar', hint: 'Bugün / son 7 gün', span: 'lg:col-span-3' },
};

export const ALL_CARDS = Object.keys(CARD_META) as DashboardCardId[];
