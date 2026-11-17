import { RESERVATION_CONFIRMED, RESERVATION_PENDING, RESERVATION_SEATED } from '@/features/customerSite/types';

// Rezervasyon kartının durum renkleri (tasarım: "Renkli · Rezervasyon sorgula"): onaylı/geldiniz zeytin, bekleyen hardal,
// iptal/red/gelinmedi soluk kahve. Yalnız site değişkenleri: Sade'de zeytin mürekkep kutusu, hardal açık kum olur.
// Bütün çiftler en az 4.5:1 (zeytin + krem ~9:1, hardal + koyu ~8:1, soluk kahve + krem ~6:1).

export interface ReservationTone {
    /** Biletin renkli yarısı (tarih). */
    ticket: string;
    /** Durum rozeti ve içindeki nokta. */
    badge: string;
    dot: string;
    /** Durum notunun açık zemini (krem kutunun üstünde, koyu yazı). */
    note: string;
}

export function reservationTone(status: number): ReservationTone {
    switch (status) {
        case RESERVATION_CONFIRMED:
        case RESERVATION_SEATED:
            return {
                ticket: 'bg-[var(--site-olive)] text-[var(--site-on-paper)]',
                badge: 'bg-[var(--site-olive)] text-[var(--site-on-paper)]',
                dot: 'bg-[var(--site-dot-ok)]',
                note: 'bg-[color-mix(in_srgb,var(--site-olive)_12%,var(--site-card))]',
            };
        case RESERVATION_PENDING:
            return {
                ticket: 'bg-[var(--site-mustard)] text-[var(--site-text)]',
                badge: 'bg-[var(--site-mustard)] text-[var(--site-text)]',
                dot: 'bg-[var(--site-text)]',
                note: 'bg-[color-mix(in_srgb,var(--site-mustard)_30%,var(--site-card))]',
            };
        default:
            return {
                ticket: 'bg-[var(--site-muted)] text-[var(--site-on-paper)]',
                badge: 'bg-[var(--site-raised)] text-[var(--site-text)]',
                dot: 'bg-[var(--site-terracotta)]',
                note: 'bg-[color-mix(in_srgb,var(--site-terracotta)_12%,var(--site-card))]',
            };
    }
}
