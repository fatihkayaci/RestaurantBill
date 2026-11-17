import { createContext, useContext } from 'react';
import { DEFAULT_DESIGN, type SiteDesignKey } from './siteTheme';

// Sitenin tasarımı ("renkli" | "sade" | "elit") bileşenlere bağlam olarak iner (SiteShell verir). Renkler ve yazı tipi CSS
// değişkenlerindedir (siteRootStyle); bu bağlam yalnız DÜZENİ tasarıma göre değişen birkaç parça içindir (üst menünün
// logo dairesi ve kutusu, ana sayfa kapağının fotoğraf yerleşimi ve süsü). Sağlayıcı yoksa varsayılan (renkli).
export const SiteDesignContext = createContext<SiteDesignKey>(DEFAULT_DESIGN);

export function useSiteDesign(): SiteDesignKey {
    return useContext(SiteDesignContext);
}
