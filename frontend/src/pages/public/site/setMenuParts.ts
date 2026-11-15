import type { PublicProduct } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';
import { formatSitePrice } from './siteTheme';

// Hazır menü kartlarının (SiteSetMenus.tsx) ortak hesapları: görsel seçimi ve indirim rozeti.

/** Kart görseli; isStock: hazır görsel kütüphanesinden ("Temsili görsel" etiketi). */
export interface SetMenuPhoto { url: string; isStock: boolean; }

/** Ürün kimliğinden fotoğrafa: menü görseli yoksa içindeki ürünün fotoğrafı için. */
export function productPhotos(products: PublicProduct[]): Map<string, SetMenuPhoto> {
    return new Map(products.filter(p => p.imageUrl).map(p => [p.id, { url: p.imageUrl, isStock: p.isStockImage }]));
}

/** Menünün görseli; yoksa önce her bölümün varsayılan (ya da ilk) ürününün, sonra herhangi bir seçeneğin fotoğrafı. */
export function setMenuImage(menu: OnlineSetMenu, photoOf: Map<string, SetMenuPhoto>): SetMenuPhoto | undefined {
    if (menu.imageUrl) return { url: menu.imageUrl, isStock: menu.isStockImage };
    const options = menu.slots.flatMap(s => s.options);
    const preferred = menu.slots.flatMap(s => s.options.find(o => o.isDefault) ?? s.options.slice(0, 1));
    return [...preferred, ...options]
        .map(o => photoOf.get(o.productId))
        .find(Boolean);
}

// İndirimli menünün rozeti: "%17 avantajlı" (yüzde aşağı yuvarlanır); %1'in altındaysa "5 ₺ kazanç". İndirim yoksa null.
export function savingLabel(menu: OnlineSetMenu): string | null {
    const diff = menu.regularPrice - menu.price;
    if (!(diff > 0) || !(menu.regularPrice > 0)) return null;
    const percent = Math.floor((diff / menu.regularPrice) * 100);
    return percent >= 1 ? `%${percent} avantajlı` : `${formatSitePrice(diff)} kazanç`;
}
