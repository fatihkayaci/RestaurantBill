import {
    Beef, Beer, CakeSlice, Coffee, Croissant, CupSoda, Drumstick, EggFried, Fish, Flame, IceCreamCone, Layers, Pizza, Salad,
    Sandwich, Soup, UtensilsCrossed, Wheat, Wine, type LucideIcon,
} from 'lucide-react';
import type { PublicProduct, PublicSite } from '@/features/customerSite/types';
import type { OnlineSetMenu } from '@/features/delivery/types';

// Masa QR menüsünün (qrMenu/) veri katmanı: ürünler ve hazır menüler (set) tek bir "kalem" listesine çevrilir; arama,
// süzgeç, sıralama, öne çıkanlar / popüler bölümleri ve kategori simgeleri burada. React yok.
// Tükenen kalemler her listede görünür kalır ama sona iner (soldOutLast).

/** Hazır menülerin (set) sanal kategorisi: çip şeridinde ve kategori görünümünde "Menüler". */
export const SET_MENU_CATEGORY = 'menuler';

export interface QrItem {
    /** "p-<id>" ürün, "s-<id>" hazır menü (adres çubuğunda da bu: ?urun=…). */
    key: string;
    kind: 'product' | 'setMenu';
    id: string;
    name: string;
    description: string;
    price: number;
    /** Hazır menünün ayrı ayrı alınınca tutarı (indirim gösterimi); ürünlerde null. */
    regularPrice: number | null;
    imageUrl: string;
    isStockImage: boolean;
    featured: boolean;
    soldOut: boolean;
    prepMinutes: number | null;
    categoryId: string;
    categoryName: string;
    /**
     * Seçim yapılacak bölümü var (hazır menüde kahve seçimi gibi): kartta adet seçici yok, "+" her zaman ayrıntıyı
     * (seçim ekranını) açar; sepetteyse "Sepette n" yazar.
     */
    hasChoices: boolean;
    /** Seçimlerden biri fiyatı artırıyor: kartta fiyat "… ₺'den" (taban fiyat; sepet seçime göre daha yüksek olabilir). */
    priceFrom: boolean;
    product?: PublicProduct;
    menu?: OnlineSetMenu;
}

/** Kalemin kartına verilenler: sepetteki adedi, ayrıntıyı açma ve hızlı ekleme (TableOrderPage'den). */
export type BindItem = (item: QrItem) => {
    quantity: number;
    onOpen: () => void;
    /** false dönerse eklenmedi. */
    onAdd: (() => boolean) | null;
    /** Sepetten bir adet düşer (en son eklenen satırdan); sepette yoksa null. */
    onRemove: (() => void) | null;
};

export interface QrCategory {
    id: string;
    name: string;
    items: QrItem[];
}

/** Hazır menünün içeriği: "Adana + İçecek seçimi + Patates" (seçimli bölüm "<bölüm> seçimi"). */
export function menuContents(menu: OnlineSetMenu): string {
    return menu.slots
        .map(slot => isChoiceSlot(slot) ? `${slot.name} seçimi` : (slot.options[0]?.productName ?? slot.name))
        .join(' + ');
}

/** Müşterinin seçim yaptığı bölüm (sabit ya da tek seçenekli değil). */
export const isChoiceSlot = (slot: OnlineSetMenu['slots'][number]) => !slot.isFixed && slot.options.length > 1;

/** Seçim yapılacak bölümü olan menü (tek seçenekli bölümler sayılmaz). */
export const hasChoices = (menu: OnlineSetMenu) => menu.slots.some(isChoiceSlot);

/** Seçimlerden biri fiyat farkı taşıyor (sepetteki tutar seçime göre taban fiyattan yüksek olabilir). */
export const hasSurcharge = (menu: OnlineSetMenu) => menu.slots.some(slot => isChoiceSlot(slot) && slot.options.some(o => o.surcharge > 0));

/**
 * Seçimsiz başlangıç: yalnız sabit ve tek seçenekli bölümler dolu; müşterinin seçeceği zorunlu bölümler boş kalır
 * (önceden seçili gelmez, "Sepete ekle" seçim yapılana kadar kapalı).
 */
export function fixedSelections(menu: OnlineSetMenu): Record<string, string> {
    const result: Record<string, string> = {};
    for (const slot of menu.slots) {
        if (isChoiceSlot(slot)) continue;
        const option = slot.options.find(o => o.isAvailable) ?? slot.options[0];
        if (option) result[slot.id] = option.productId;
    }
    return result;
}

export function buildCategories(site: PublicSite): QrCategory[] {
    const menus = site.setMenus ?? [];
    const menuCategory: QrCategory[] = menus.length > 0 ? [{
        id: SET_MENU_CATEGORY,
        name: 'Menüler',
        items: menus.map(menu => ({
            key: `s-${menu.id}`, kind: 'setMenu', id: menu.id, name: menu.name,
            description: menu.description?.trim() || menuContents(menu),
            price: menu.price, regularPrice: menu.regularPrice > menu.price ? menu.regularPrice : null,
            imageUrl: menu.imageUrl, isStockImage: menu.isStockImage, featured: menu.isFeatured, soldOut: !menu.isAvailable,
            prepMinutes: null, categoryId: SET_MENU_CATEGORY, categoryName: 'Menüler', menu,
            hasChoices: hasChoices(menu), priceFrom: hasSurcharge(menu),
        })),
    }] : [];
    const productCategories: QrCategory[] = site.categories.map(c => ({
        id: c.id,
        name: c.name,
        items: c.products.map(p => ({
            key: `p-${p.id}`, kind: 'product', id: p.id, name: p.name, description: p.description?.trim() ?? '',
            price: p.price, regularPrice: null, imageUrl: p.imageUrl, isStockImage: p.isStockImage, featured: p.isFeatured,
            soldOut: p.isOutOfStock, prepMinutes: p.prepMinutes, categoryId: c.id, categoryName: c.name, product: p,
            hasChoices: false, priceFrom: false,

        })),
    }));
    return [...menuCategory, ...productCategories]
        .filter(c => c.items.length > 0)
        .map(c => ({ ...c, items: soldOutLast(c.items) }));
}

/** Tükenenler sona; geri kalan sıra korunur. */
export function soldOutLast(items: QrItem[]): QrItem[] {
    return [...items.filter(item => !item.soldOut), ...items.filter(item => item.soldOut)];
}

/** Ana sayfanın büyük kartlı bölümlerinde en fazla bu kadar kalem (iki sütunlu ızgarada üç sıra). */
export const SHOWCASE_MAX = 6;

/**
 * "Öne Çıkanlar": restoranın öne çıkardığı (isFeatured) ve şu an alınabilen kalemler, menü sırasıyla; görseli olanlar
 * önce (büyük kartta fotoğraf asıl içerik). Tükenenler vitrinde yer kaplamaz, kendi bölümlerinde sonda görünür.
 */
export function featuredItems(categories: QrCategory[], max = SHOWCASE_MAX): QrItem[] {
    return categories.flatMap(c => c.items)
        .filter(item => item.featured && !item.soldOut)
        .sort((a, b) => Number(!!b.imageUrl) - Number(!!a.imageUrl))
        .slice(0, max);
}

/** "Popüler"de en az bu kadar kalem yoksa bölüm gizlenir (sunucu da aynı eşikle boş döner). */
export const POPULAR_MIN = 3;

/** "Popüler": sunucunun satış sırasıyla ürün kimlikleri → menüde olan ve alınabilen ürünler; azsa boş. */
export function popularItems(categories: QrCategory[], productIds: readonly string[] | undefined, max = SHOWCASE_MAX): QrItem[] {
    if (!productIds?.length) return [];
    const byId = new Map(categories.flatMap(c => c.items).filter(item => item.kind === 'product').map(item => [item.id, item]));
    const items = productIds.map(id => byId.get(id)).filter((item): item is QrItem => !!item && !item.soldOut).slice(0, max);
    return items.length >= POPULAR_MIN ? items : [];
}

// ── Arama ve süzgeç ──────────────────────────────────────────────────────────────────────────

/** Türkçe harfler sadeleşir: "Çorba" ile "corba", "şiş" ile "sis" eşleşir. */
export function fold(text: string): string {
    return text.toLocaleLowerCase('tr-TR')
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
        .replace(/[âà]/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
}

export function searchItems(categories: QrCategory[], query: string): QrItem[] {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return categories.flatMap(c => c.items).filter(item => {
        const haystack = fold(`${item.name} ${item.description} ${item.categoryName}`);
        return words.every(word => haystack.includes(word));
    });
}

export type QrSort = 'menu' | 'price-asc' | 'price-desc';

export interface QrFilters {
    /** Tükenenler gizlenir. */
    inStockOnly: boolean;
    sort: QrSort;
}

export const DEFAULT_FILTERS: QrFilters = { inStockOnly: false, sort: 'menu' };

export function activeFilterCount(filters: QrFilters): number {
    return Number(filters.inStockOnly) + Number(filters.sort !== 'menu');
}

/** Süzgeç ve sıralama; fiyata göre sıralamada da tükenenler sonda kalır. */
export function applyFilters(items: QrItem[], filters: QrFilters): QrItem[] {
    const kept = filters.inStockOnly ? items.filter(item => !item.soldOut) : items;
    if (filters.sort === 'menu') return soldOutLast(kept);
    const dir = filters.sort === 'price-asc' ? 1 : -1;
    return soldOutLast([...kept].sort((a, b) => (a.price - b.price) * dir));
}

/** Hesabın ödenme anı (ISO) → ms; yoksa ya da okunamazsa null. */
/** Saat:dakika (tr-TR). */
export const timeOf = (ms: number) => new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export function parsePaidAt(paidAt: string | null | undefined): number | null {
    if (!paidAt) return null;
    const ms = Date.parse(paidAt);
    return Number.isNaN(ms) ? null : ms;
}

// ── Kategori simgesi ─────────────────────────────────────────────────────────────────────────

// Kategorinin kendi simgesi yok: adındaki sözcükten tahmin edilir, bulunamazsa çatal-bıçak. Yalnız süs (aria-hidden).
const ICON_RULES: [RegExp, LucideIcon][] = [
    [/corba/, Soup],
    [/kahvalt|yumurta|omlet|menemen/, EggFried],
    [/izgara|mangal|ocakbas/, Flame],
    [/kebap|kebab|et yemek|kofte|biftek|steak|burger/, Beef],
    [/tavuk|kanat|pilic/, Drumstick],
    [/balik|deniz|fish/, Fish],
    [/salata|meze|baslangic|zeytinyag|vegan|sebze/, Salad],
    [/pide|lahmacun|pizza/, Pizza],
    [/tost|sandvic|durum|wrap|sandwich/, Sandwich],
    [/borek|pogaca|unlu|simit|firin|hamur/, Croissant],
    [/makarna|pilav|manti|eriste/, Wheat],
    [/tatli|pasta|baklava|kunefe|dessert/, CakeSlice],
    [/dondurma/, IceCreamCone],
    [/kahve|cay|sicak icecek|coffee/, Coffee],
    [/bira|beer/, Beer],
    [/sarap|raki|alkol|kokteyl|wine/, Wine],
    [/icecek|soguk|mesrubat|limonata|meyve suyu|ayran|drink/, CupSoda],
];

export function categoryIcon(category: { id: string; name: string }): LucideIcon {
    if (category.id === SET_MENU_CATEGORY) return Layers;
    const name = fold(category.name);
    return ICON_RULES.find(([pattern]) => pattern.test(name))?.[1] ?? UtensilsCrossed;
}
