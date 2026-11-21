import type { SiteDesignKey } from '../siteTheme';

// Tasarımın VERİ özellikleri (bileşen yok): masa QR, paket sipariş, takip gibi her sayfadan, admin'den ve siteTheme.ts'ten
// döngüsüz okunabilsin diye ayrı dosyada. Tasarımın bileşenleri (sayfalar, üst menü, alt bilgi) registry.ts'te.
// Ayrıntı: designs/README.md.

/** Ortak menünün (DeliveryMenu) ürün sunumu: kart, Sıcak'ın tabak kartı, Meyhane'nin basılı menü satırı + meze
 *  tepsisi, Esnaf'ın pano satırı. Site Menü sayfası, masa QR menüsü ve paket sipariş menüsü aynı değeri kullanır. */
export type MenuVariant = 'default' | 'sicak' | 'meyhane' | 'esnaf';

export interface SiteDesignTraits {
    /** Menünün sunumu (site Menü sayfası ve masa QR menüsü). Paket sipariş sayfası Sıcak'ta ayrıca tabak kartını seçer. */
    menuVariant: Exclude<MenuVariant, 'sicak'>;
    /** Akış sayfalarının (site çerçevesi, masa QR, paket sipariş, takip) kökündeki giydirme sınıfı (Elit: köşesiz, ince). */
    flowClass?: string;
    /** Telefon alt eylem çubuğunun düğmeleri: yuvarlak hap (varsayılan) ya da köşesiz büyük harf (Elit). */
    mobileBar?: 'pill' | 'square';
}

const DEFAULT_TRAITS: SiteDesignTraits = { menuVariant: 'default' };

/** Tasarımın varsayılandan farklı özellikleri; yazılmayan özellik DEFAULT_TRAITS'ten gelir. */
const TRAITS: Partial<Record<SiteDesignKey, Partial<SiteDesignTraits>>> = {
    elit: { flowClass: 'rb-el-flow', mobileBar: 'square' },
    meyhane: { menuVariant: 'meyhane' },
    esnaf: { menuVariant: 'esnaf' },
};

/** Tasarımın özellikleri (anahtar `resolveDesign` ile çözülmüş olmalı). */
export function designTraits(key: SiteDesignKey): SiteDesignTraits {
    return { ...DEFAULT_TRAITS, ...TRAITS[key] };
}
