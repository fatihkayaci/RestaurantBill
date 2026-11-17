import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicSite } from '@/features/customerSite/types';
import { foldText } from './siteParts';
import { useSiteWindow } from './siteEditContext';

// Menü sayfasının arama, süzgeç ve kategori şeridi durumu (Renkli/Sade ve Elit menüsü birlikte kullanır). Sıra
// admin'deki sıradır; hazır menüler aramaya girer, ürün süzgeci açıkken gösterilmez.

export const SET_MENUS_ID = 'kat-hazir';
export const FAST_MINUTES = 10;

/** Kaydırırken görünen bölümün kimliği (yapışkan şeridin hemen altındaki bölüm). */
function useActiveSection(ids: string[]): string | null {
    const win = useSiteWindow();
    const [active, setActive] = useState<string | null>(null);
    const key = ids.join('|');
    useEffect(() => {
        const list = key ? key.split('|') : [];
        if (list.length === 0) return;
        let frame = 0;
        const update = () => {
            frame = 0;
            const line = 140;
            let current: string | null = null;
            for (const id of list) {
                const el = win.document.getElementById(id);
                if (el && el.getBoundingClientRect().top - line <= 0) current = id;
            }
            setActive(current ?? list[0]);
        };
        const onScroll = () => { if (!frame) frame = win.requestAnimationFrame(update); };
        update();
        win.addEventListener('scroll', onScroll, { passive: true });
        win.addEventListener('resize', onScroll);
        return () => {
            win.removeEventListener('scroll', onScroll);
            win.removeEventListener('resize', onScroll);
            if (frame) win.cancelAnimationFrame(frame);
        };
    }, [key, win]);
    return active;
}

export function useMenuView(site: PublicSite | null) {
    const [query, setQuery] = useState('');
    const [onlyFeatured, setOnlyFeatured] = useState(false);
    const [onlyFast, setOnlyFast] = useState(false);
    const strip = useRef<HTMLDivElement>(null);
    const products = useMemo(() => site?.categories.flatMap(c => c.products) ?? [], [site]);
    const filtering = onlyFeatured || onlyFast;

    const groups = useMemo(() => {
        if (!site) return [];
        const q = foldText(query);
        return site.categories
            .map(category => ({
                id: `kat-${category.id}`,
                category,
                items: category.products.filter(p =>
                    (!q || foldText(`${p.name} ${p.description} ${category.name}`).includes(q))
                    && (!onlyFeatured || p.isFeatured)
                    && (!onlyFast || (!!p.prepMinutes && p.prepMinutes <= FAST_MINUTES))),
            }))
            .filter(g => g.items.length > 0);
    }, [site, query, onlyFeatured, onlyFast]);

    // Hazır menüler de aramaya girer (ad, açıklama, içindeki ürünler); ürün süzgeci açıkken gösterilmez.
    const setMenus = useMemo(() => {
        if (filtering) return [];
        const menus = site?.setMenus ?? [];
        const q = foldText(query);
        if (!q) return menus;
        return menus.filter(m => foldText([m.name, m.description, ...m.slots.flatMap(s => [s.name, ...s.options.map(o => o.productName)])].join(' ')).includes(q));
    }, [site, query, filtering]);

    const nav = useMemo(() => [
        ...(setMenus.length > 0 ? [{ id: SET_MENUS_ID, label: 'Hazır menüler' }] : []),
        ...groups.map(g => ({ id: g.id, label: g.category.name })),
    ], [groups, setMenus]);
    const active = useActiveSection(nav.map(n => n.id));

    // Görünen bölümün bağlantısı şeritte görünür kalsın (yalnız şerit yatay kayar).
    useEffect(() => {
        const bar = strip.current;
        const link = active ? bar?.querySelector<HTMLElement>(`[data-nav="${active}"]`) : null;
        if (!bar || !link || bar.scrollWidth <= bar.clientWidth) return;
        const left = link.offsetLeft;
        if (left < bar.scrollLeft || left + link.offsetWidth > bar.scrollLeft + bar.clientWidth) {
            bar.scrollTo({ left: Math.max(0, left - 24), behavior: 'smooth' });
        }
    }, [active]);

    return { query, setQuery, onlyFeatured, setOnlyFeatured, onlyFast, setOnlyFast, products, groups, setMenus, nav, active, strip };
}
