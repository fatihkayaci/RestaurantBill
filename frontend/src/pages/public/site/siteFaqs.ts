import { canReserveOnline, type PublicSite } from '@/features/customerSite/types';
import { DoorPayment } from '@/features/courier/types';
import type { OnlineOrdering } from '@/features/delivery/types';
import { isOnlineOrderingAvailable } from '@/features/delivery/useOnlineOrderingAvailable';
import { formatPrice } from '@/lib/format';

// İletişim sayfasının "Sık sorulanlar"ı. Sorular hazır listedir (restoran yazmaz); cevaplar yalnız restoranın girdiği
// ayarlardan oluşur: rezervasyon kuralları, teslimat mahalleleri, ödeme yolları ve mekân olanakları. Her sorunun kalıcı
// bir anahtarı vardır; restoran istemediğini gizler (site.hiddenFaqs, sunucuda SiteContent.HiddenFaqs). Olanak soruları
// yalnız olanak işaretliyse "Evet, …" cevabıyla görünür: işaretli değilse cevabı bilmediğimiz için soru hiç çizilmez
// ("hayır" denmez). Yeni soru eklenirse anahtarı değiştirilmemeli (gizleyen restoranın tercihi bağlıdır).

export interface FaqItem {
    /** Kalıcı anahtar (küçük harf, rakam, tire): "rezervasyon", "otopark"… */
    key: string;
    q: string;
    /** Cevap; soru şu an geçerli değilse null (müşteri görmez). */
    a: string | null;
    /** Geçerli değilken düzenleyicide gösterilen kısa neden ("Teslimat bölgesi ekleyince görünür"). */
    reason: string;
}

const amenityReason = (label: string) => `Mekân'da “${label}” işaretlenince görünür`;

/** Bütün hazır sorular, sitedeki sırayla; her biri şu anki ayarlara göre cevaplı ya da (cevapsız) nedeniyle. */
export function faqItems(site: PublicSite, ordering: OnlineOrdering | null): FaqItem[] {
    const items: FaqItem[] = [];
    const has = (key: string) => site.site.amenities.includes(key);

    // ── Rezervasyon ──
    const canReserve = canReserveOnline(site);
    const r = site.reservation;
    const limits = [
        r.maxPartySize > 0 ? `en fazla ${r.maxPartySize} kişilik` : null,
        r.maxDaysAhead > 0 ? `${r.maxDaysAhead} gün sonrasına kadar` : null,
    ].filter(Boolean).join(', ');
    const reserveReason = 'Online rezervasyon açılınca görünür';
    items.push({
        key: 'rezervasyon', q: 'Rezervasyon nasıl yapılır?', reason: reserveReason,
        a: canReserve
            ? `Üst menüdeki “Masa ayırt”tan gün, saat ve kişi sayısını seçmeniz yeterli.${limits ? ` Online olarak ${limits} rezervasyon alıyoruz.` : ''}${site.phone ? ` Daha kalabalık gruplar için ${site.phone} numarasından bize ulaşın.` : ''}`
            : null,
    });
    items.push({
        key: 'rezervasyon-sorgula', q: 'Rezervasyonumu nasıl sorgularım?', reason: reserveReason,
        a: canReserve
            ? 'Size verilen kısa kod ve telefon numaranızla “Rezervasyon sorgula” sayfasından durumunu görebilirsiniz. Rezervasyonunuzu saatinden 2 saat öncesine kadar oradan iptal edebilirsiniz.'
            : null,
    });

    // ── Paket sipariş ──
    const canOrder = isOnlineOrderingAvailable(ordering) && !!ordering;
    const orderReason = 'Online sipariş açılınca görünür';
    const zones = canOrder ? ordering.zones.filter(z => z.isActive) : [];
    items.push({
        key: 'teslimat-bolgeleri', q: 'Paket servis hangi bölgelere var?',
        reason: canOrder ? 'Teslimat bölgesi ekleyince görünür' : orderReason,
        a: zones.length > 0
            ? `${zones.map(z => {
                const parts = [
                    z.fee > 0 ? `${formatPrice(z.fee)} ₺ teslimat` : 'ücretsiz teslimat',
                    z.minOrderAmount > 0 ? `en az ${formatPrice(z.minOrderAmount)} ₺` : null,
                    z.estimatedMinutes > 0 ? `~${z.estimatedMinutes} dk` : null,
                ].filter(Boolean).join(', ');
                return `${z.name} (${parts})`;
            }).join('; ')}. Sipariş sırasında mahallenizi seçince ücret ve süre kendiliğinden görünür.`
            : null,
    });
    items.push({
        key: 'siparis-takip', q: 'Siparişimi nasıl takip ederim?', reason: orderReason,
        a: canOrder
            ? 'Siparişinizi verdiğinizde açılan takip sayfasında durumunu canlı görebilirsiniz. Aynı cihazdan üst menüdeki “Siparişim”e dokunarak da bu sayfaya dönebilirsiniz.'
            : null,
    });
    const methods = canOrder ? [
        ordering.paymentMethods.includes(DoorPayment.Nakit) ? 'nakit' : null,
        ordering.paymentMethods.includes(DoorPayment.Kart) ? 'kartla' : null,
    ].filter(Boolean) : [];
    const iban = canOrder && ordering.paymentMethods.includes(DoorPayment.Iban);
    const doorText = methods.length > 0 ? `kapıda ${methods.join(' veya ')}` : '';
    items.push({
        key: 'odeme', q: 'Paket siparişte ödemeyi nasıl yapabilirim?',
        reason: canOrder ? 'Online siparişte kapıda ödeme yolu seçilince görünür' : orderReason,
        a: methods.length > 0 || iban
            ? `Paket siparişlerde ödemeyi ${[doorText, iban ? 'IBAN ile havale/EFT olarak' : ''].filter(Boolean).join(' ya da ')} yapabilirsiniz.`
            : null,
    });

    // ── Mekân (olanaklardan; yalnız "evet") ──
    const parking = has('otopark');
    const valet = has('vale');
    items.push({
        key: 'otopark', q: 'Otopark var mı?', reason: amenityReason('Otopark'),
        a: parking && valet ? 'Evet, otoparkımız var; vale hizmeti de veriyoruz.'
            : parking ? 'Evet, misafirlerimiz için otoparkımız var.'
                : valet ? 'Evet, vale hizmetimiz var.' : null,
    });
    items.push({
        key: 'engelli', q: 'Engelli erişimi var mı?', reason: amenityReason('Engelli erişimi'),
        a: has('engelli') ? 'Evet, mekânımız engelli erişimine uygundur.' : null,
    });
    const kids = [
        has('cocuk') ? 'Evet, çocuk dostu bir mekânız.' : null,
        has('bebek-sandalyesi') ? 'Bebek sandalyemiz var.' : null,
        has('aile-salonu') ? 'Aile salonumuz da var.' : null,
    ].filter(Boolean);
    items.push({
        key: 'cocuk', q: 'Çocuklarla gelebilir miyiz?', reason: amenityReason('Çocuk dostu'),
        a: kids.length > 0 ? (has('cocuk') ? kids.join(' ') : `Evet. ${kids.join(' ')}`) : null,
    });
    items.push({
        key: 'evcil', q: 'Evcil hayvanımla gelebilir miyim?', reason: amenityReason('Evcil hayvan dostu'),
        a: has('evcil') ? 'Evet, evcil hayvan dostu bir mekânız.' : null,
    });
    items.push({
        key: 'wifi', q: 'Wi-Fi var mı?', reason: amenityReason('Ücretsiz Wi-Fi'),
        a: has('wifi') ? 'Evet, misafirlerimize ücretsiz Wi-Fi sunuyoruz.' : null,
    });
    items.push({
        key: 'vejetaryen', q: 'Vejetaryen seçenek var mı?', reason: amenityReason('Vejetaryen seçenek'),
        a: has('vejetaryen') ? 'Evet, menümüzde vejetaryen seçenekler var.' : null,
    });
    items.push({
        key: 'kartla-odeme', q: 'Restoranda kartla ödeyebilir miyim?', reason: amenityReason('Kartla ödeme'),
        a: has('kartla-odeme') ? 'Evet, restoranda kartla ödeme alıyoruz.' : null,
    });
    const terrace = has('teras');
    const garden = has('avlu');
    items.push({
        key: 'acik-alan', q: 'Açık havada oturabilir miyiz?', reason: amenityReason('Teras ya da Avlu / bahçe'),
        a: terrace && garden ? 'Evet, terasımız ve avlumuz var.'
            : terrace ? 'Evet, terasımız var.'
                : garden ? 'Evet, avlu / bahçemiz var.' : null,
    });
    items.push({
        key: 'canli-muzik', q: 'Canlı müzik var mı?', reason: amenityReason('Canlı müzik'),
        a: has('canli-muzik') ? 'Evet, mekânımızda canlı müzik var.' : null,
    });
    items.push({
        key: 'sigara-alani', q: 'Sigara içilebilen bir alan var mı?', reason: amenityReason('Sigara içilebilir alan'),
        a: has('sigara-alani') ? 'Evet, sigara içilebilen bir alanımız var.' : null,
    });
    const contact = site.site.whatsappPhone ? 'WhatsApp’tan' : site.phone ? 'telefonla' : null;
    items.push({
        key: 'ozel-gun', q: 'Grup ve özel gün organizasyonu yapıyor musunuz?', reason: amenityReason('Grup ve özel gün organizasyonu'),
        a: has('ozel-gun') ? `Evet, grup ve özel gün organizasyonları yapıyoruz.${contact ? ` Ayrıntılar için bize ${contact} ulaşın.` : ''}` : null,
    });
    return items;
}

/** Müşterinin gördüğü sorular: cevaplı ve restoranın gizlemediği. */
export function visibleFaqs(site: PublicSite, ordering: OnlineOrdering | null): { key: string; q: string; a: string }[] {
    const hidden = new Set(site.site.hiddenFaqs ?? []);
    return faqItems(site, ordering)
        .filter((f): f is FaqItem & { a: string } => f.a !== null && !hidden.has(f.key))
        .map(({ key, q, a }) => ({ key, q, a }));
}
