import {
    RESERVATION_CANCELLED, RESERVATION_CONFIRMED, RESERVATION_NO_SHOW, RESERVATION_PENDING, RESERVATION_REJECTED, RESERVATION_SEATED,
} from '@/features/customerSite/types';

// Rezervasyon sayfalarının küçük yardımcıları: tarayıcıda üretilen takvim dosyası (.ics), geri sayım ve gün adı.
// Saatler şubenin yerel saatiyle ("2026-11-14", "19:30") gelir; .ics'e "yüzen" yerel saat olarak yazılır (Z eki yok),
// böylece takvim uygulaması misafirin telefonundaki saatle aynı göstergeyi kullanır.

export interface CalendarEvent {
    title: string;
    /** "2026-11-14" */
    date: string;
    /** "19:30" */
    time: string;
    /** "21:30"; başlangıçtan küçükse ertesi güne sarkar. */
    endTime: string;
    location?: string;
    description?: string;
    /** Dosya adında ve UID'de kullanılır (ör. rezervasyon kodu). */
    uid: string;
}

function escapeIcs(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function stamp(date: string, time: string, addDays = 0): string {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const value = new Date(y, m - 1, d + addDays, hh, mm);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}T${pad(value.getHours())}${pad(value.getMinutes())}00`;
}

export function buildIcs(event: CalendarEvent): string {
    const overnight = event.endTime <= event.time;
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//RestaurantBill//Rezervasyon//TR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${event.uid.replace(/[^A-Za-z0-9-]/g, '')}@rezervasyon`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(event.date, event.time)}`,
        `DTEND:${stamp(event.date, event.endTime, overnight ? 1 : 0)}`,
        `SUMMARY:${escapeIcs(event.title)}`,
        ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
        ...(event.description ? [`DESCRIPTION:${escapeIcs(event.description)}`] : []),
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcs(event.title)}`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ];
    return lines.join('\r\n');
}

/** .ics dosyasını indirir; telefonda takvim uygulaması açılır. */
export function downloadIcs(event: CalendarEvent) {
    const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rezervasyon-${event.uid.replace(/[^A-Za-z0-9-]/g, '') || 'masa'}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "3 gün 4 saat kaldı", "2 saat 15 dk kaldı", "12 dk kaldı"; geçtiyse null. */
export function countdownText(startsAtUtc: string, now: number): string | null {
    const ms = new Date(startsAtUtc).getTime() - now;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const totalMinutes = Math.floor(ms / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return hours > 0 ? `${days} gün ${hours} saat kaldı` : `${days} gün kaldı`;
    if (hours > 0) return minutes > 0 ? `${hours} saat ${minutes} dk kaldı` : `${hours} saat kaldı`;
    return `${Math.max(1, minutes)} dk kaldı`;
}

function localDate(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** "Bugün", "Yarın" ya da gün adı ("Cuma"); bir haftadan uzaksa "14 Kasım". */
export function dayWord(date: string, now = new Date()): string {
    const target = localDate(date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    if (diff === 0) return 'Bugün';
    if (diff === 1) return 'Yarın';
    if (diff > 1 && diff < 7) return target.toLocaleDateString('tr-TR', { weekday: 'long' });
    return target.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

/** Kartlar için: { weekday: "Cuma", day: "14", month: "Kasım" }. */
export function dateParts(date: string): { weekday: string; day: string; month: string } {
    const value = localDate(date);
    return {
        weekday: value.toLocaleDateString('tr-TR', { weekday: 'long' }),
        day: String(value.getDate()),
        month: value.toLocaleDateString('tr-TR', { month: 'long' }),
    };
}

// Rezervasyon durumu rozeti (rezervasyon sorgula ve rezervasyon sayfası).
export function reservationStatusBadge(status: number): { text: string; className: string } {
    switch (status) {
        case RESERVATION_CONFIRMED: return { text: 'Onaylandı', className: 'bg-[var(--site-ok-bg)] text-[var(--site-ok)]' };
        case RESERVATION_PENDING: return { text: 'Onay bekliyor', className: 'bg-[#FCEBC7] text-[#713F12]' };
        case RESERVATION_SEATED: return { text: 'Geldiniz', className: 'bg-[var(--site-ok-bg)] text-[var(--site-ok)]' };
        case RESERVATION_REJECTED: return { text: 'Onaylanmadı', className: 'bg-[var(--site-error-bg)] text-[var(--site-error)]' };
        case RESERVATION_CANCELLED: return { text: 'İptal edildi', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
        case RESERVATION_NO_SHOW: return { text: 'Gelinmedi', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
        default: return { text: 'Kayıtlı', className: 'bg-[var(--site-raised)] text-[var(--site-sub)]' };
    }
}
