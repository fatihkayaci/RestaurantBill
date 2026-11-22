export interface Category {
    id: string;
    name: string;
    taxRate: number | null;
    effectiveTaxRate: number;
    /** Müşteri menüsündeki görünüm: 0 otomatik (fotoğraf oranına göre), 1 kart, 2 liste. Eski sunucuda yok. */
    menuDisplay?: CategoryMenuDisplay;
    /** Servis penceresi: gün maskesi (bit 0 = Pazar … bit 6 = Cumartesi); null: her gün. Eski sunucu: yok. */
    availableDays?: number | null;
    /** "HH:mm"; null: gün başından. */
    availableFrom?: string | null;
    /** "HH:mm"; null: gün sonuna. Başlangıçtan küçükse gece yarısını aşar. */
    availableUntil?: string | null;
    /** Şubenin saatine göre şu an pencerede mi (garson/kasa uyarısı; sipariş engellenmez). Eski sunucu: yok, açık say. */
    availableNow?: boolean;
    /** "12:00'ye kadar", "Hafta içi 08:00–12:00"; pencere yoksa boş. */
    availabilityLabel?: string;
}

/** Kategori formundaki servis penceresi; üçü de boş: "Her zaman". */
export interface CategoryAvailabilityInput {
    days: number | null;
    from: string | null;
    until: string | null;
}

export type CategoryMenuDisplay = 0 | 1 | 2;
