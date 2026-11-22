import { defaultSelections, setMenuUnitPrice } from '@/features/delivery/deliveryCart';
import type { MenuDisplay, OnlineMenuProduct, OnlineSetMenu } from '@/features/delivery/types';

// Sophra menü sayfasının modeli (React yok): ürün ve hazır menüyü tek "menü kalemi"ne çevirir, etiketleri (Önerilen, Yeni,
// Popüler) ve kategorinin görünümünü (kart / liste) seçer, detay penceresinin taslağını tutar.

export type MenuTag = 'featured' | 'new' | 'popular';

export interface MenuItem {
    /** "p:<id>" ya da "s:<id>" (taslak ve anahtar). */
    key: string;
    kind: 'product' | 'setMenu';
    id: string;
    name: string;
    description: string;
    price: number;
    /** İndirimli hazır menüde normal fiyat; yoksa null. */
    regularPrice: number | null;
    imageUrl: string;
    isStockImage: boolean;
    soldOut: boolean;
    tags: MenuTag[];
    /** Hazır menüde içindekiler ("Adana, İçecek seçimi, Patates"). */
    contents: string;
    product?: OnlineMenuProduct;
    setMenu?: OnlineSetMenu;
}

/** Sitenin ve paket menüsünün ürün şekli (sitede hazırlanma süresi de var; burada gerekmez). */
export type MenuProductLike = Pick<OnlineMenuProduct, 'id' | 'name' | 'price' | 'imageUrl' | 'isStockImage' | 'description' | 'isFeatured' | 'isOutOfStock'> & { isNew?: boolean };

export function productItem(p: MenuProductLike, popular: ReadonlySet<string>): MenuItem {
    const tags: MenuTag[] = [];
    if (p.isFeatured) tags.push('featured');
    if (p.isNew) tags.push('new');
    if (popular.has(p.id)) tags.push('popular');
    return {
        key: `p:${p.id}`, kind: 'product', id: p.id, name: p.name, description: p.description?.trim() ?? '', price: p.price, regularPrice: null,
        imageUrl: p.imageUrl, isStockImage: p.isStockImage, soldOut: p.isOutOfStock, tags, contents: '', product: p as OnlineMenuProduct,
    };
}

/** "Adana + İçecek seçimi + Patates": tek seçenekli bölüm ürün adıyla, seçimli bölüm "<bölüm> seçimi". */
export function setMenuContents(menu: OnlineSetMenu): string {
    return menu.slots.map(s => (s.isFixed || s.options.length === 1 ? s.options[0]?.productName ?? s.name : `${s.name} seçimi`)).join(', ');
}

export function setMenuItem(m: OnlineSetMenu): MenuItem {
    return {
        key: `s:${m.id}`, kind: 'setMenu', id: m.id, name: m.name, description: m.description?.trim() ?? '', price: m.price,
        regularPrice: m.regularPrice > m.price ? m.regularPrice : null, imageUrl: m.imageUrl, isStockImage: m.isStockImage,
        soldOut: !m.isAvailable, tags: m.isFeatured ? ['featured'] : [], contents: setMenuContents(m), setMenu: m,
    };
}

/**
 * Kategorinin görünümü: varsayılan fotoğraflı kartlar; yönetici kategori için "Liste" seçtiyse sıkı liste. Fotoğraf sayısına
 * göre kendiliğinden listeye geçilmez (karar yöneticinin). Fotoğrafı olmayan ürün kartta yer tutucuyla çizilir.
 */
export function categoryLayout(display: MenuDisplay | undefined): 'cards' | 'list' {
    return display === 'list' ? 'list' : 'cards';
}

/** Detay penceresinin taslağı (kapatıp açınca korunur, sepete eklenince silinir). */
export interface ItemDraft {
    quantity: number;
    note: string;
    /** Hazır menü: bölüm → ürün. */
    selections: Record<string, string>;
}

export function newDraft(item: MenuItem): ItemDraft {
    return { quantity: 1, note: '', selections: item.setMenu ? defaultSelections(item.setMenu) : {} };
}

export function draftUnitPrice(item: MenuItem, draft: ItemDraft): number {
    return item.setMenu ? setMenuUnitPrice(item.setMenu, draft.selections) : item.price;
}
