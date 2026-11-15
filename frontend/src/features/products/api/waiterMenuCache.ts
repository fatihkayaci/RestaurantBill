import { getSession } from '@/lib/auth';
import { categoryService } from '@/features/categories/api/categoryService';
import type { Category } from '@/features/categories/types';
import { setMenuService } from '@/features/setMenus/api/setMenuService';
import type { SetMenu } from '@/features/setMenus/types';
import type { Product } from '../types';
import { productService } from './productService';

// Garsonun "Ürün ekle" ekranı için menü önbelleği (stale-while-revalidate).
// Önbellek doluysa ekran onu hemen gösterir, arkada menü yeniden çekilir ve gelen veri yerine geçer.
// Aynı anda yalnızca bir istek uçar; çağıranlar aynı promise'i paylaşır.
// Önbellek kullanıcıya ve şubeye bağlıdır: oturum veya şube değişince eski menü kullanılmaz.

export interface WaiterMenu {
    categories: Category[];
    /** Yalnızca aktif ürünler. */
    products: Product[];
    /** Yalnızca satıştaki menüler ("Adana Menü"). */
    setMenus: SetMenu[];
}

interface CacheEntry {
    scope: string;
    menu: WaiterMenu;
    fetchedAt: number;
}

/** prefetch bu süreden taze bir önbellek varsa yeniden çekmez. */
const PREFETCH_FRESH_MS = 60_000;

let cached: CacheEntry | null = null;
let inFlight: { scope: string; promise: Promise<WaiterMenu> } | null = null;

function currentScope(): string {
    const session = getSession();
    return `${session?.userId ?? ''}:${session?.restaurantId ?? ''}`;
}

/** Önbellekteki menü; yoksa veya başka bir oturuma/şubeye aitse null. */
export function peekWaiterMenu(): WaiterMenu | null {
    return cached && cached.scope === currentScope() ? cached.menu : null;
}

/** Menüyü sunucudan çeker ve önbelleğe yazar. Süren bir istek varsa onu döner. */
export function loadWaiterMenu(): Promise<WaiterMenu> {
    const scope = currentScope();
    if (inFlight && inFlight.scope === scope) return inFlight.promise;

    // Menüler alınamazsa ürün eklemek yine çalışsın: menü listesi boş gelir, "Menüler" çipi çıkmaz.
    const setMenusRequest = setMenuService.getSetMenus().catch(() => [] as SetMenu[]);
    const promise = Promise.all([categoryService.getCategories(), productService.getProducts(), setMenusRequest])
        .then(([categories, products, setMenus]) => {
            const menu = { categories, products: products.filter(p => p.isActive), setMenus: setMenus.filter(s => s.isActive) };
            cached = { scope, menu, fetchedAt: Date.now() };
            return menu;
        })
        .finally(() => {
            if (inFlight?.promise === promise) inFlight = null;
        });
    inFlight = { scope, promise };
    return promise;
}

/** Masalar ekranından çağrılmak için: menüyü önceden ısıtır, hatayı yutar. */
export function prefetchWaiterMenu(): void {
    const fresh = cached && cached.scope === currentScope() && Date.now() - cached.fetchedAt < PREFETCH_FRESH_MS;
    if (fresh) return;
    loadWaiterMenu().catch(() => { /* ekran açılınca yeniden denenir */ });
}
