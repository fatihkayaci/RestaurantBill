import type { CSSProperties } from 'react';
import { SITE_FONTS_HREF, siteFontsHref, siteRootStyle } from './site/siteTheme';

// Müşteri akışı sayfalarının (masa QR'ı, masa menüsü, /siparis, sipariş takibi, rezervasyon sayfaları) kök görünümü.
// Hepsi restoran sitesinin temasını kullanır; temayı tek yerden okuyup siteRootStyle'a vermek için bu sarmalayıcı var.

/** Restoranın site ayarından gelen görünüm bilgisi (PublicSite.site ya da takip DTO'su). */
export interface CustomerBrand {
    accentColor?: string | null;
    /** Hazır renk teması (SITE_THEMES anahtarı); boş = varsayılan. */
    theme?: string | null;
    /** Sitenin tasarımı ("renkli" | "sade"); boş = renkli. */
    design?: string | null;
    /** Yazı tipi çifti (SITE_FONTS anahtarı); boş = tasarımın kendi yazı tipi. */
    font?: string | null;
}

export function customerRootStyle(brand?: CustomerBrand | null): CSSProperties {
    return siteRootStyle(brand?.accentColor, brand?.theme, brand?.design, brand?.font);
}

/** Akış sayfasının yazı tipi CSS'i: restoran bilinince yalnız seçili çift, bilinmeden tasarımların kendi çiftleri. */
export function customerFontsHref(brand?: CustomerBrand | null): string {
    return brand ? siteFontsHref(brand.design, brand.font) : SITE_FONTS_HREF;
}

/** Restoranın açılış saati bugün mü yarın mı: "Bugün 08:00'de" / "Yarın 08:00'de" (telefonun saatine göre). */
export function opensText(opensAt: string | null, now = new Date()): string | null {
    if (!opensAt) return null;
    const [h, m] = opensAt.split(':').map(Number);
    const minutes = now.getHours() * 60 + now.getMinutes();
    return `${minutes < h * 60 + m ? 'Bugün' : 'Yarın'} ${opensAt}'de`;
}
