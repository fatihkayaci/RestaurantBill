import { formatPrice } from '@/lib/format';
import type { DeliveryZone, OnlineOrdering } from './types';

// Paket siparişin ekran metinleri (React yok): sipariş sayfası (/siparis) ve Sophra menü sayfası ortak kullanır.

function timeOfDay(iso: string): string {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

/** "Bugün 11:00", "Yarın 08:00", "Cuma 11:00" (tarayıcının saatiyle; şube ile aynı saat diliminde kabul edilir). */
export function opensText(iso: string): string {
    const at = new Date(iso);
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOf(at) - startOf(new Date())) / 86_400_000);
    const day = days <= 0 ? 'Bugün' : days === 1 ? 'Yarın' : at.toLocaleDateString('tr-TR', { weekday: 'long' });
    return `${day} ${timeOfDay(iso)}`;
}

/** Arama için: küçük harf, aksanlar ve Türkçe harfler sadeleşir ("Kadıköy" → "kadikoy"). */
export function foldSearch(text: string): string {
    return text.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** "Künefe", "Künefe ve Ayran", "Künefe, Ayran ve Sütlaç". */
export function listNames(names: string[]): string {
    return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]}`;
}

/** Mahallenin süre, ücret ve en az tutar yazıları. */
export function zoneFacts(zone: DeliveryZone) {
    return {
        time: zone.estimatedMinutes > 0 ? `~${zone.estimatedMinutes} dk` : '—',
        fee: zone.fee > 0 ? `${formatPrice(zone.fee)} ₺` : 'Ücretsiz',
        minimum: zone.minOrderAmount > 0 ? `${formatPrice(zone.minOrderAmount)} ₺` : 'Yok',
    };
}

/** Gel al'ın yaklaşık hazır olma süresi ("~20 dk"). */
export function pickupEtaText(data: OnlineOrdering): string {
    return data.pickupEtaMinutes ? `~${data.pickupEtaMinutes} dk` : '—';
}
