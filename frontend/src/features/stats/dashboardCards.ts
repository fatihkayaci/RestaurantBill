import type { DashboardCardId } from './types';

// Genel Bakış kart kataloğu. Kimlikler backend'deki DashboardCards.All ile aynı olmalı; sıra varsayılan düzendir.
// span: 6 sütunlu masaüstü ızgarasında (md'de 2 sütun) kartın genişliği.
export const CARD_META: Record<DashboardCardId, { title: string; hint: string; span: string }> = {
    revenue: { title: 'Bugünün cirosu', hint: 'Nakit / kart / QR / IBAN, düne göre fark', span: 'lg:col-span-3' },
    pending: { title: 'Seni bekleyenler', hint: 'QR siparişi, rezervasyon isteği, sayım', span: 'lg:col-span-3' },
    tables: { title: 'Masa durumu', hint: 'Canlı masalar: doluluk, mutfak, hazır ürün, hesap, gecikme', span: 'md:col-span-2 lg:col-span-6' },
    hourly: { title: 'Saatlik satış', hint: 'Bugün ve geçen haftanın aynı günü', span: 'md:col-span-2 lg:col-span-4' },
    reservations: { title: 'Bugünkü rezervasyonlar', hint: 'Saat, isim, durum', span: 'lg:col-span-2' },
    top: { title: 'En çok satanlar', hint: 'Bugün / son 7 gün', span: 'lg:col-span-3' },
};

export const ALL_CARDS = Object.keys(CARD_META) as DashboardCardId[];

/**
 * Backend bilinmeyen kimlikleri zaten atlıyor; bu yalnızca sürüm farkına karşı emniyet
 * (ör. yeni bir kart backend'e frontend'den önce eklenirse).
 */
export function knownCards(cards: readonly string[]): DashboardCardId[] {
    return cards.filter((id): id is DashboardCardId => id in CARD_META);
}
