import { useEffect, useState } from 'react';
import { useSiteWindow } from './siteEditContext';

const SCROLL_THRESHOLD = 8;

/** Sayfa birkaç piksel kaydırıldı mı (yapışkan üst menünün zeminini açmak için); `enabled` false ise hep false. */
export function useScrolled(enabled = true): boolean {
    const win = useSiteWindow();
    const [scrolled, setScrolled] = useState(() => enabled && win.scrollY > SCROLL_THRESHOLD);
    useEffect(() => {
        if (!enabled) return;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = win.requestAnimationFrame(() => {
                frame = 0;
                setScrolled(win.scrollY > SCROLL_THRESHOLD);
            });
        };
        win.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
            win.removeEventListener('scroll', onScroll);
            if (frame) win.cancelAnimationFrame(frame);
        };
    }, [enabled, win]);
    return enabled && scrolled;
}

const HIDE_AFTER = 80;
const DIRECTION_DELTA = 16;

/**
 * Yapışkan üst menü için: aşağı kaydırınca true (menü gizlenir), yukarı kaydırınca false (menü geri gelir).
 * Sayfanın en üstüne yakınken ve `enabled` false iken hep false.
 */
export function useHideOnScroll(enabled = true): boolean {
    const win = useSiteWindow();
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        if (!enabled) return;
        let last = win.scrollY;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = win.requestAnimationFrame(() => {
                frame = 0;
                const y = win.scrollY;
                if (y <= HIDE_AFTER) { setHidden(false); last = y; return; }
                const delta = y - last;
                if (Math.abs(delta) < DIRECTION_DELTA) return;
                setHidden(delta > 0);
                last = y;
            });
        };
        win.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            win.removeEventListener('scroll', onScroll);
            if (frame) win.cancelAnimationFrame(frame);
        };
    }, [enabled, win]);
    return enabled && hidden;
}
