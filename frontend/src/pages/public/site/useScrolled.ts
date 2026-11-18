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
